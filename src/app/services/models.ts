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

export interface HorarioAtencion {
  dias: number[];
  inicio: string;
  fin: string;
}

export const HORARIO_POR_DEFECTO: HorarioAtencion = {
  dias: [1, 2, 3, 4, 5, 6],
  inicio: '09:00',
  fin: '19:00'
};

export interface Barbero {
  id?: string;
  nombre: string;
  activo: boolean;
  horario?: HorarioAtencion;
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
  precio?: number;        
  estado: EstadoReserva;
}