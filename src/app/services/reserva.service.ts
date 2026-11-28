import { Injectable, inject } from '@angular/core';
import {
  collection, doc, getDoc, getDocs, query, where, writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { AuthService } from './auth.service';
import { ServicioService } from './servicio.service';
import { Reserva } from './models';

const HORA_APERTURA = 9;      
const HORA_CIERRE = 19;       
const DIAS_CERRADOS = [0];    

interface Ocupado {
  inicio: number;
  fin: number;
}

export function haySolape(nuevoInicio: number, nuevoFin: number, existentes: Ocupado[]): boolean {
  return existentes.some((e) => nuevoInicio < e.fin && nuevoFin > e.inicio);
}

@Injectable({ providedIn: 'root' })
export class ReservaService {
  private auth = inject(AuthService);
  private servicios = inject(ServicioService);

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
    const inicioMin = inicioDate.getHours() * 60 + inicioDate.getMinutes();
    const finMin = inicioMin + servicio.duracionMinutos;
    if (inicioMin < HORA_APERTURA * 60 || finMin > HORA_CIERRE * 60) {
      throw new Error(`El horario de atención es de ${HORA_APERTURA}:00 a ${HORA_CIERRE}:00 y el servicio debe terminar dentro de ese horario.`);
    }

    const inicio = inicioDate.getTime();
    const fin = inicio + servicio.duracionMinutos * 60000;
    const fecha = datos.fechaHora.slice(0, 10);

    const q = query(
      collection(db, 'horariosOcupados'),
      where('barberoId', '==', datos.barberoId),
      where('fecha', '==', fecha)
    );
    const snap = await getDocs(q);
    const ocupados = snap.docs.map((d) => d.data() as Ocupado);
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

  async marcarAtendida(id: string): Promise<void> {
    if (!this.auth.esAdmin()) throw new Error('Solo el administrador puede hacer esto.');
    const batch = writeBatch(db);
    batch.update(doc(db, 'reservas', id), { estado: 'ATENDIDA' });
    await batch.commit();
  }
}