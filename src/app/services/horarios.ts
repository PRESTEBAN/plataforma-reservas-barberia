import { Barbero, HORARIO_POR_DEFECTO, HorarioAtencion } from './models';

export interface Intervalo {
  inicio: number; 
  fin: number;    
}
export const PASO_MINUTOS = 30;

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


export function fechaLocal(fecha: string, hhmm = '00:00'): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(anio, mes - 1, dia, h, m, 0, 0);
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
  const d = new Date(inicio);
  if (!horario.dias.includes(d.getDay())) {
    return 'El barbero no atiende ese día.';
  }
  const inicioMin = d.getHours() * 60 + d.getMinutes();
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
  if (!horario.dias.includes(fechaLocal(fecha).getDay())) return [];

  const horas: string[] = [];
  const apertura = aMinutos(horario.inicio);
  const cierre = aMinutos(horario.fin);

  for (let m = apertura; m + duracionMin <= cierre; m += paso) {
    const inicio = fechaLocal(fecha, aHHmm(m)).getTime();
    const fin = inicio + duracionMin * 60000;
    if (inicio <= ahora) continue;
    if (haySolape(inicio, fin, ocupados)) continue;
    horas.push(aHHmm(m));
  }
  return horas;
}