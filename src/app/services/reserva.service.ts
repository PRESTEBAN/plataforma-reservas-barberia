import { Injectable, inject } from '@angular/core';
import {
  collection, doc, getDoc, getDocs, onSnapshot, query, Unsubscribe, updateDoc, where, writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { AuthService } from './auth.service';
import { ServicioService } from './servicio.service';
import { fechaNegocio, generarHoras, haySolape, horarioDe, Intervalo, validarEnHorario } from './horarios';
import { Barbero, Reserva, Servicio } from './models';

export { haySolape };

@Injectable({ providedIn: 'root' })
export class ReservaService {
  private auth = inject(AuthService);
  private servicios = inject(ServicioService);

  async obtenerOcupados(barberoId: string, fecha: string): Promise<Intervalo[]> {
    const q = query(
      collection(db, 'horariosOcupados'),
      where('barberoId', '==', barberoId),
      where('fecha', '==', fecha)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const o = d.data();
      return { inicio: o['inicio'] as number, fin: o['fin'] as number };
    });
  }

  async horasDisponibles(servicio: Servicio, barbero: Barbero, fecha: string): Promise<string[]> {
    const ocupados = await this.obtenerOcupados(barbero.id!, fecha);
    return generarHoras(fecha, servicio.duracionMinutos, horarioDe(barbero), ocupados);
  }

  async crearReserva(datos: { servicioId: string; barberoId: string; fechaHora: string }): Promise<Reserva> {
    const usuario = this.auth.usuario();
    if (!usuario) {
      throw new Error('Debes iniciar sesión para reservar.');
    }

    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(datos.fechaHora)) {
      throw new Error('La fecha y hora no son válidas.');
    }
    const inicioDate = fechaNegocio(datos.fechaHora.slice(0, 10), datos.fechaHora.slice(11, 16));
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

    const inicio = inicioDate.getTime();
    const fin = inicio + servicio.duracionMinutos * 60000;
    const fecha = datos.fechaHora.slice(0, 10);

    const errorHorario = validarEnHorario(inicio, servicio.duracionMinutos, horarioDe(barbero));
    if (errorHorario) {
      throw new Error(errorHorario);
    }

    const ocupados = await this.obtenerOcupados(barbero.id!, fecha);
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

  escucharTodas(
    alCambiar: (reservas: Reserva[], nuevas: Reserva[]) => void,
    alFallar?: (error: Error) => void
  ): Unsubscribe {
    let primera = true;
    return onSnapshot(
      collection(db, 'reservas'),
      (snap) => {
        const reservas = snap.docs
          .map((d) => ({ ...(d.data() as Reserva), id: d.id }))
          .sort((a, b) => a.inicio - b.inicio);
        const nuevas = primera
          ? []
          : snap
              .docChanges()
              .filter((c) => c.type === 'added')
              .map((c) => ({ ...(c.doc.data() as Reserva), id: c.doc.id }));
        primera = false;
        alCambiar(reservas, nuevas);
      },
      (error) => alFallar?.(error)
    );
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

  async marcarAtendida(id: string): Promise<void> {
    if (!this.auth.esAdmin()) throw new Error('Solo el administrador puede hacer esto.');

    const ref = doc(db, 'reservas', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('La reserva no existe.');
    const reserva = snap.data() as Reserva;

    if (reserva.estado !== 'CONFIRMADA') {
      throw new Error('Solo se pueden marcar como atendidas las reservas confirmadas.');
    }
    if (reserva.fin > Date.now()) {
      throw new Error('Solo puedes marcar como atendida una reserva cuando su horario ya terminó.');
    }

    await updateDoc(ref, { estado: 'ATENDIDA' });
  }
}