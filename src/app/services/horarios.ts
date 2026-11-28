import { Barbero, HORARIO_POR_DEFECTO, HorarioAtencion } from './models';

export interface Intervalo {
  inicio: number; 
  fin: number;    
}
export const PASO_MINUTOS = 30;

/**
 * Zona horaria del negocio: America/Guayaquil (UTC-5, sin horario de verano).
 * TODAS las fechas y horas de la aplicación (interfaz, validaciones y datos en
 * Firestore) se interpretan en esta zona, sin importar la zona del navegador.
 * En Firestore, `inicio` y `fin` se guardan como milisegundos UTC (epoch) y
 * `fecha` como 'YYYY-MM-DD' del día en esta zona.
 */
export const ZONA_HORARIA = 'America/Guayaquil';
export const OFFSET_NEGOCIO = '-05:00';
const OFFSET_NEGOCIO_MS = -5 * 60 * 60 * 1000;

export const NOMBRES_DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const NOMBRES_DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function aHHmm(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}


/** Convierte una fecha 'YYYY-MM-DD' y una hora 'HH:mm' (hora del negocio) en un instante. */
export function fechaNegocio(fecha: string, hhmm = '00:00'): Date {
  return new Date(`${fecha}T${hhmm}:00${OFFSET_NEGOCIO}`);
}

/** Descompone un instante (ms) en fecha, minutos del día y día de la semana, en hora del negocio. */
export function partesNegocio(ms: number): { fecha: string; minutosDelDia: number; diaSemana: number } {
  const d = new Date(ms + OFFSET_NEGOCIO_MS);
  return {
    fecha: d.toISOString().slice(0, 10),
    minutosDelDia: d.getUTCHours() * 60 + d.getUTCMinutes(),
    diaSemana: d.getUTCDay()
  };
}

/** Fecha de hoy ('YYYY-MM-DD') en la zona horaria del negocio. */
export function hoyNegocio(): string {
  return partesNegocio(Date.now()).fecha;
}

export function horarioDe(barbero: Barbero | null | undefined): HorarioAtencion {
  return barbero?.horario ?? HORARIO_POR_DEFECTO;
}


export function resumenHorario(h: HorarioAtencion): string {
  const dias = [...h.dias].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)); // lunes primero
  return `${dias.map((d) => NOMBRES_DIAS_CORTOS[d]).join(', ')} · ${h.inicio} - ${h.fin}`;
}

export function haySolape(nuevoInicio: number, nuevoFin: number, existentes: Intervalo[]): boolean {
  return existentes.some((e) => nuevoInicio < e.fin && nuevoFin > e.inicio);
}

export function validarEnHorario(inicio: number, duracionMin: number, horario: HorarioAtencion): string | null {
  const p = partesNegocio(inicio);
  if (!horario.dias.includes(p.diaSemana)) {
    return 'El barbero no atiende ese día.';
  }
  const inicioMin = p.minutosDelDia;
  const finMin = inicioMin + duracionMin;
  if (inicioMin < aMinutos(horario.inicio) || finMin > aMinutos(horario.fin)) {
    return `El horario de atención de este barbero es de ${horario.inicio} a ${horario.fin} y el servicio debe terminar dentro de ese horario.`;
  }
  return null;
}

export function reservaCabeEnHorario(inicio: number, fin: number, horario: HorarioAtencion): boolean {
  return validarEnHorario(inicio, Math.round((fin - inicio) / 60000), horario) === null;
}

export function validarHorario(h: HorarioAtencion): string | null {
  if (!h.dias.length) return 'Selecciona al menos un día de atención.';
  if (!/^\d{2}:\d{2}$/.test(h.inicio) || !/^\d{2}:\d{2}$/.test(h.fin)) return 'Las horas no son válidas.';
  if (aMinutos(h.inicio) >= aMinutos(h.fin)) return 'La hora de inicio debe ser anterior a la hora de fin.';
  return null;
}


export function generarHoras(
  fecha: string,
  duracionMin: number,
  horario: HorarioAtencion,
  ocupados: Intervalo[],
  ahora: number = Date.now(),
  paso: number = PASO_MINUTOS
): string[] {
  // El día de la semana de una fecha de calendario no depende de la zona horaria.
  if (!horario.dias.includes(new Date(`${fecha}T00:00:00Z`).getUTCDay())) return [];

  const horas: string[] = [];
  const apertura = aMinutos(horario.inicio);
  const cierre = aMinutos(horario.fin);

  for (let m = apertura; m + duracionMin <= cierre; m += paso) {
    const inicio = fechaNegocio(fecha, aHHmm(m)).getTime();
    const fin = inicio + duracionMin * 60000;
    if (inicio <= ahora) continue;
    if (haySolape(inicio, fin, ocupados)) continue;
    horas.push(aHHmm(m));
  }
  return horas;
}