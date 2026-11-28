// Funciones puras (sin Firebase) para la regla de disponibilidad. Así se pueden probar fácilmente.
// Zona horaria del negocio: Ecuador (America/Guayaquil, UTC-5); se usa la hora local del navegador.

export const HORA_APERTURA = '09:00';
export const HORA_CIERRE = '19:00';
export const DIAS_CERRADOS = [0]; // 0 = domingo

export interface Ocupado {
  inicio: number; // milisegundos
  fin: number;
}

export function dosDigitos(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

// "10:30" -> 630 (minutos desde la medianoche)
export function aMinutos(hora: string): number {
  const partes = hora.split(':');
  return Number(partes[0]) * 60 + Number(partes[1]);
}

// 630 -> "10:30"
export function minutosAHora(minutos: number): string {
  return dosDigitos(Math.floor(minutos / 60)) + ':' + dosDigitos(minutos % 60);
}

// Date -> "2026-11-28"
export function fechaATexto(f: Date): string {
  return f.getFullYear() + '-' + dosDigitos(f.getMonth() + 1) + '-' + dosDigitos(f.getDate());
}

// Regla central: hay cruce si nuevoInicio < finExistente Y nuevoFin > inicioExistente.
// Una cita que empieza justo cuando termina otra NO se cruza.
export function haySolape(nuevoInicio: number, nuevoFin: number, existentes: Ocupado[]): boolean {
  return existentes.some((e) => nuevoInicio < e.fin && nuevoFin > e.inicio);
}

// Horas de inicio libres (cada 30 min) de un barbero en un día.
// - la cita completa debe caber entre horaInicio y horaFin
// - no se ofrecen horas pasadas ni horas que se crucen con reservas ocupadas
export function generarHorarios(
  fecha: string,
  duracionMinutos: number,
  horaInicio: string,
  horaFin: string,
  ocupados: Ocupado[],
  ahora: number
): string[] {
  if (!fecha || DIAS_CERRADOS.includes(new Date(fecha + 'T00:00').getDay())) {
    return [];
  }
  const horas: string[] = [];
  const cierre = aMinutos(horaFin);
  for (let m = aMinutos(horaInicio); m + duracionMinutos <= cierre; m += 30) {
    const hora = minutosAHora(m);
    const inicio = new Date(fecha + 'T' + hora).getTime();
    const fin = inicio + duracionMinutos * 60000;
    if (inicio > ahora && !haySolape(inicio, fin, ocupados)) {
      horas.push(hora);
    }
  }
  return horas;
}