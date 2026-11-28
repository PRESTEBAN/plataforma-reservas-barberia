import { Injectable } from '@angular/core';
import {
  addDoc, collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where
} from 'firebase/firestore';
import { db } from './firebase';
import { reservaCabeEnHorario, validarHorario } from './horarios';
import { Barbero, HORARIO_POR_DEFECTO, HorarioAtencion, Reserva, Servicio } from './models';

@Injectable({ providedIn: 'root' })
export class ServicioService {
  async listarServicios(soloActivos = false): Promise<Servicio[]> {
    const snap = await getDocs(collection(db, 'servicios'));
    const lista = snap.docs.map((d) => ({ ...(d.data() as Servicio), id: d.id }));
    return soloActivos ? lista.filter((s) => s.activo) : lista;
  }

  async obtenerServicio(id: string): Promise<Servicio | null> {
    const snap = await getDoc(doc(db, 'servicios', id));
    return snap.exists() ? { ...(snap.data() as Servicio), id: snap.id } : null;
  }

  async crearServicio(servicio: Servicio): Promise<void> {
    const { id, ...datos } = servicio;
    await addDoc(collection(db, 'servicios'), datos);
  }

  async actualizarServicio(id: string, cambios: Partial<Servicio>): Promise<void> {
    await updateDoc(doc(db, 'servicios', id), cambios);
  }

  async cambiarEstadoServicio(id: string, activo: boolean): Promise<void> {
    await updateDoc(doc(db, 'servicios', id), { activo });
  }

  async listarBarberos(soloActivos = false): Promise<Barbero[]> {
    const snap = await getDocs(collection(db, 'barberos'));
    const lista = snap.docs.map((d) => ({ ...(d.data() as Barbero), id: d.id }));
    return soloActivos ? lista.filter((b) => b.activo) : lista;
  }

  async obtenerBarbero(id: string): Promise<Barbero | null> {
    const snap = await getDoc(doc(db, 'barberos', id));
    return snap.exists() ? { ...(snap.data() as Barbero), id: snap.id } : null;
  }

  async cambiarEstadoBarbero(id: string, activo: boolean): Promise<void> {
    await updateDoc(doc(db, 'barberos', id), { activo });
  }

  async actualizarHorarioBarbero(barberoId: string, horario: HorarioAtencion): Promise<void> {
    const error = validarHorario(horario);
    if (error) throw new Error(error);

    const q = query(
      collection(db, 'reservas'),
      where('barberoId', '==', barberoId),
      where('estado', '==', 'CONFIRMADA')
    );
    const snap = await getDocs(q);
    const ahora = Date.now();
    const conflictos = snap.docs
      .map((d) => d.data() as Reserva)
      .filter((r) => r.inicio > ahora && !reservaCabeEnHorario(r.inicio, r.fin, horario));

    if (conflictos.length > 0) {
      throw new Error(
        `No se puede cambiar el horario: ${conflictos.length} reserva(s) futura(s) confirmada(s) quedarían fuera del nuevo horario. Cancélalas primero.`
      );
    }

    await updateDoc(doc(db, 'barberos', barberoId), { horario });
  }

}