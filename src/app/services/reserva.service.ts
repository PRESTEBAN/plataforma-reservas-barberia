import { Injectable, inject } from '@angular/core';
import {
  collection, doc, getDoc, getDocs, query, updateDoc, where, writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { AuthService } from './auth.service';
import { ServicioService } from './servicio.service';
import { Reserva } from './models';
import {
  DIAS_CERRADOS, HORA_APERTURA, HORA_CIERRE, Ocupado,
  aMinutos, fechaATexto, generarHorarios, haySolape
} from './horarios';

// La regla de cruce de horarios vive en horarios.ts (funciones puras). Se re-exporta por compatibilidad.
export { haySolape };

@Injectable({ providedIn: 'root' })
export class ReservaService {
  private auth = inject(AuthService);
  private servicios = inject(ServicioService);

  // Horas libres de un barbero para un servicio y una fecha (lee los horarios ocupados en Firestore)
  async horariosDisponibles(barberoId: string, servicioId: string, fecha: string): Promise<string[]> {
    const servicio = await this.servicios.obtenerServicio(servicioId);
    const barbero = await this.servicios.obtenerBarbero(barberoId);
    if (!servicio || !barbero || !fecha) {
      return [];
    }
    const ocupados = await this.obtenerOcupados(barberoId, fecha);
    return generarHorarios(
      fecha,
      servicio.duracionMinutos,
      barbero.horaInicio ?? HORA_APERTURA,
      barbero.horaFin ?? HORA_CIERRE,
      ocupados,
      Date.now()
    );
  }

  async crearReserva(datos: { servicioId: string; barberoId: string; fechaHora: string }): Promise<Reserva> {
    const usuario = this.auth.usuario();
    if (!usuario) {
      throw new Error('Debes iniciar sesión para reservar.');
    }

    const inicioDate = new Date(datos.fechaHora);
    if (isNaN(inicioDate.getTime())) {
      throw new Error('La fecha y hora no son válidas.');
    }
    if (inicioDate.getTime() <= Date.now()) {
      throw new Error('La fecha y hora deben ser futuras.');
    }

    const servicio = await this.servicios.obtenerServicio(datos.servicioId);
    if (!servicio || !servicio.activo) {
      throw new Error('El servicio seleccionado no está disponible.');
    }
    const barbero = await this.servicios.obtenerBarbero(datos.barberoId);
    if (!barbero || !barbero.activo) {
      throw new Error('El barbero seleccionado no está disponible.');
    }

    if (DIAS_CERRADOS.includes(inicioDate.getDay())) {
      throw new Error('La barbería no atiende ese día.');
    }
    // Horario de atención del barbero (si no tiene uno propio, el general)
    const apertura = barbero.horaInicio ?? HORA_APERTURA;
    const cierre = barbero.horaFin ?? HORA_CIERRE;
    const inicioMin = inicioDate.getHours() * 60 + inicioDate.getMinutes();
    const finMin = inicioMin + servicio.duracionMinutos;
    if (inicioMin < aMinutos(apertura) || finMin > aMinutos(cierre)) {
      throw new Error(`${barbero.nombre} atiende de ${apertura} a ${cierre} y el servicio debe terminar dentro de ese horario.`);
    }

    const inicio = inicioDate.getTime();
    const fin = inicio + servicio.duracionMinutos * 60000;
    const fecha = datos.fechaHora.slice(0, 10);


    const ocupados = await this.obtenerOcupados(datos.barberoId, fecha);
    if (haySolape(inicio, fin, ocupados)) {
      throw new Error('Ese barbero ya tiene una reserva en ese horario. Elige otra hora u otro barbero.');
    }

    const ref = doc(collection(db, 'reservas'));
    const reserva: Reserva = {
      clienteUid: usuario.uid,
      clienteNombre: usuario.nombre,
      clienteEmail: usuario.email,
      servicioId: servicio.id!,
      servicioNombre: servicio.nombre,
      barberoId: barbero.id!,
      barberoNombre: barbero.nombre,
      fecha,
      inicio,
      fin,
      duracionMinutos: servicio.duracionMinutos,
      precio: servicio.precio,
      estado: 'CONFIRMADA'
    };

    const batch = writeBatch(db);
    batch.set(ref, reserva);
    batch.set(doc(db, 'horariosOcupados', ref.id), {
      barberoId: reserva.barberoId,
      fecha,
      inicio,
      fin,
      clienteUid: usuario.uid
    });
    await batch.commit();

    return { ...reserva, id: ref.id };
  }

  async listarMisReservas(): Promise<Reserva[]> {
    const usuario = this.auth.usuario();
    if (!usuario) return [];
    const q = query(collection(db, 'reservas'), where('clienteUid', '==', usuario.uid));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ ...(d.data() as Reserva), id: d.id }))
      .sort((a, b) => b.inicio - a.inicio);
  }

  async listarTodas(): Promise<Reserva[]> {
    const snap = await getDocs(collection(db, 'reservas'));
    return snap.docs
      .map((d) => ({ ...(d.data() as Reserva), id: d.id }))
      .sort((a, b) => a.inicio - b.inicio);
  }


  async cancelarReserva(id: string): Promise<void> {
    const usuario = this.auth.usuario();
    if (!usuario) throw new Error('Debes iniciar sesión.');

    const ref = doc(db, 'reservas', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('La reserva no existe.');
    const reserva = snap.data() as Reserva;

    if (reserva.estado !== 'CONFIRMADA') {
      throw new Error('Solo se pueden cancelar reservas confirmadas.');
    }
    if (!this.auth.esAdmin()) {
      if (reserva.clienteUid !== usuario.uid) {
        throw new Error('No puedes cancelar reservas de otras personas.');
      }
      if (reserva.inicio <= Date.now()) {
        throw new Error('No puedes cancelar una reserva que ya comenzó.');
      }
    }

    const batch = writeBatch(db);
    batch.update(ref, { estado: 'CANCELADA' });
    batch.delete(doc(db, 'horariosOcupados', id)); 
    await batch.commit();
  }

  // Solo el administrador, solo reservas confirmadas y solo cuando la cita ya terminó.
  async marcarAtendida(id: string): Promise<void> {
    if (!this.auth.esAdmin()) throw new Error('Solo el administrador puede hacer esto.');
    const ref = doc(db, 'reservas', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('La reserva no existe.');
    const reserva = snap.data() as Reserva;
    if (reserva.estado !== 'CONFIRMADA') {
      throw new Error('Solo se pueden atender reservas confirmadas.');
    }
    if (reserva.fin > Date.now()) {
      throw new Error('La cita todavía no ha terminado.');
    }
    // La reserva atendida conserva su registro en horariosOcupados (historial de ocupación)
    await updateDoc(ref, { estado: 'ATENDIDA' });
  }

  // Cambia el horario de atención de un barbero. Se rechaza si dejaría fuera una reserva
  // futura confirmada (los cambios no modifican reservas existentes en silencio).
  async cambiarHorarioBarbero(barberoId: string, horaInicio: string, horaFin: string): Promise<void> {
    if (!this.auth.esAdmin()) throw new Error('Solo el administrador puede hacer esto.');
    if (!horaInicio || !horaFin) {
      throw new Error('Indica la hora de inicio y la hora de fin.');
    }
    if (aMinutos(horaInicio) >= aMinutos(horaFin)) {
      throw new Error('La hora de inicio debe ser menor que la hora de fin.');
    }
    const q = query(
      collection(db, 'reservas'),
      where('barberoId', '==', barberoId),
      where('estado', '==', 'CONFIRMADA')
    );
    const snap = await getDocs(q);
    const conflicto = snap.docs.some((d) => {
      const r = d.data() as Reserva;
      if (r.fin <= Date.now()) return false; // las citas pasadas no cuentan
      const inicioMin = new Date(r.inicio).getHours() * 60 + new Date(r.inicio).getMinutes();
      const finMin = new Date(r.fin).getHours() * 60 + new Date(r.fin).getMinutes();
      return inicioMin < aMinutos(horaInicio) || finMin > aMinutos(horaFin);
    });
    if (conflicto) {
      throw new Error('No se puede cambiar: hay reservas futuras confirmadas fuera del nuevo horario.');
    }
    await this.servicios.actualizarHorarioBarbero(barberoId, horaInicio, horaFin);
  }

  // Crea reservas ficticias en los próximos días para poder probar horarios libres y ocupados.
  // Quedan a nombre del administrador (las reglas solo permiten crear reservas propias).
  async sembrarReservasEjemplo(): Promise<void> {
    const usuario = this.auth.usuario();
    if (!usuario || !this.auth.esAdmin()) {
      throw new Error('Solo el administrador puede cargar datos de ejemplo.');
    }
    const ejemplos = [
      { id: 'demo-1', servicioId: '1', barberoId: 'b1', dias: 1, hora: '10:00' },
      { id: 'demo-2', servicioId: '2', barberoId: 'b1', dias: 1, hora: '15:00' },
      { id: 'demo-3', servicioId: '2', barberoId: 'b3', dias: 1, hora: '11:30' },
      { id: 'demo-4', servicioId: '3', barberoId: 'b2', dias: 2, hora: '09:00' },
      { id: 'demo-5', servicioId: '1', barberoId: 'b4', dias: 2, hora: '16:00' }
    ];
    for (const e of ejemplos) {
      if ((await getDoc(doc(db, 'reservas', e.id))).exists()) continue; // no repetir si ya existe
      const servicio = await this.servicios.obtenerServicio(e.servicioId);
      const barbero = await this.servicios.obtenerBarbero(e.barberoId);
      if (!servicio || !barbero) continue;

      const dia = new Date();
      dia.setDate(dia.getDate() + e.dias);
      if (dia.getDay() === 0) dia.setDate(dia.getDate() + 1); // domingo cerrado
      const fecha = fechaATexto(dia);
      const inicio = new Date(fecha + 'T' + e.hora).getTime();
      const fin = inicio + servicio.duracionMinutos * 60000;

      const batch = writeBatch(db);
      batch.set(doc(db, 'reservas', e.id), {
        clienteUid: usuario.uid, clienteNombre: 'Cliente de ejemplo', clienteEmail: 'ejemplo@taurus.com',
        servicioId: servicio.id, servicioNombre: servicio.nombre, barberoId: barbero.id, barberoNombre: barbero.nombre,
        fecha, inicio, fin, duracionMinutos: servicio.duracionMinutos, precio: servicio.precio, estado: 'CONFIRMADA'
      });
      batch.set(doc(db, 'horariosOcupados', e.id), {
        barberoId: barbero.id, fecha, inicio, fin, clienteUid: usuario.uid
      });
      await batch.commit();
    }
  }

  // Horarios ya reservados de un barbero en una fecha ("YYYY-MM-DD")
  private async obtenerOcupados(barberoId: string, fecha: string): Promise<Ocupado[]> {
    const q = query(
      collection(db, 'horariosOcupados'),
      where('barberoId', '==', barberoId),
      where('fecha', '==', fecha)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Ocupado);
  }
}