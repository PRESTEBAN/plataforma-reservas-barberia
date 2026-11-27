export type Rol = 'cliente' | 'admin';
export type EstadoReserva = 'CONFIRMADA' | 'CANCELADA' | 'ATENDIDA';

export interface Usuario {
  uid: string;
  nombre: string;
  email: string;
  rol: Rol;
}

export interface Servicio {
  id?: string;
  nombre: string;
  descripcion: string;
  duracionMinutos: number;
  precio: number;
  activo: boolean;
}

export interface Barbero {
  id?: string;
  nombre: string;
  activo: boolean;
}

export interface Reserva {
  id?: string;
  clienteUid: string;
  clienteNombre: string;
  clienteEmail: string;
  servicioId: string;
  servicioNombre: string;
  barberoId: string;
  barberoNombre: string;
  fecha: string;          
  inicio: number;         
  fin: number;            
  duracionMinutos: number;
  estado: EstadoReserva;
}