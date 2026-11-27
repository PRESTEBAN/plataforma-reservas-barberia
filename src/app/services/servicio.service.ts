import { Injectable } from '@angular/core';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Barbero, Servicio } from './models';

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

  // ---------- BARBEROS ----------
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

  async sembrarDatos(): Promise<void> {
    const servicios: Servicio[] = [
      { id: '1', nombre: 'Corte TAURUS Urban', descripcion: 'Corte moderno con acabado profesional.', duracionMinutos: 30, precio: 8, activo: true },
      { id: '2', nombre: 'Corte + Barba Premium', descripcion: 'Corte completo y perfilado de barba.', duracionMinutos: 45, precio: 12, activo: true },
      { id: '3', nombre: 'Barba Express & Contornos', descripcion: 'Perfilado y contornos rápidos.', duracionMinutos: 20, precio: 5, activo: true }
    ];
    const barberos: Barbero[] = [
      { id: 'b1', nombre: 'Efren (Master Fade)', activo: true },
      { id: 'b2', nombre: 'Edgardo (Tijera Premium)', activo: true },
      { id: 'b3', nombre: 'Julio (Perfilado de Barba)', activo: true },
      { id: 'b4', nombre: 'Carlos (Tratamientos Capilares)', activo: true }
    ];
    for (const s of servicios) {
      const { id, ...datos } = s;
      await setDoc(doc(db, 'servicios', id!), datos);
    }
    for (const b of barberos) {
      const { id, ...datos } = b;
      await setDoc(doc(db, 'barberos', id!), datos);
    }
  }
}