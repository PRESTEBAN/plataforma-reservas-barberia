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

// El barbero es el "recurso reservable". horaInicio y horaFin ("HH:mm") son su horario de atención;
// si no existen en Firestore se usa el horario general (09:00 a 19:00).
export interface Barbero {
  id?: string;
  nombre: string;
  activo: boolean;
  horaInicio?: string;
  horaFin?: string;
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
  precio?: number;        // precio del servicio al momento de reservar
  estado: EstadoReserva;
}