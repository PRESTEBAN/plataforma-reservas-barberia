import {
  fechaNegocio, generarHoras, haySolape, hoyNegocio, partesNegocio, validarEnHorario
} from './horarios';
import { HorarioAtencion } from './models';

// Pruebas de la regla central: un barbero no puede tener dos reservas activas que se crucen.
// Las fechas se interpretan en la zona horaria del negocio (America/Guayaquil, UTC-5).
describe('Regla de disponibilidad (horarios.ts)', () => {
  const horario: HorarioAtencion = { dias: [1, 2, 3, 4, 5, 6], inicio: '09:00', fin: '19:00' };
  const LUNES = '2030-06-03';
  const DOMINGO = '2030-06-09';

  const ms = (hora: string) => fechaNegocio(LUNES, hora).getTime();
  const ocupado = { inicio: ms('10:00'), fin: ms('10:30') };

  it('detecta cruce: 10:15-10:45 contra 10:00-10:30', () => {
    expect(haySolape(ms('10:15'), ms('10:45'), [ocupado])).toBe(true);
  });

  it('detecta cruce cuando la nueva cita empieza antes: 09:45-10:15', () => {
    expect(haySolape(ms('09:45'), ms('10:15'), [ocupado])).toBe(true);
  });

  it('permite empezar justo cuando termina otra: 10:30-11:00', () => {
    expect(haySolape(ms('10:30'), ms('11:00'), [ocupado])).toBe(false);
  });

  it('permite terminar justo cuando empieza otra: 09:30-10:00', () => {
    expect(haySolape(ms('09:30'), ms('10:00'), [ocupado])).toBe(false);
  });

  it('no hay cruce con otro horario del día', () => {
    expect(haySolape(ms('14:00'), ms('14:30'), [ocupado])).toBe(false);
  });

  it('las horas libres excluyen las que se cruzan con una reserva', () => {
    const horas = generarHoras(LUNES, 30, horario, [ocupado], 0);
    expect(horas).not.toContain('10:00');
    expect(horas).toContain('09:30');
    expect(horas).toContain('10:30');
  });

  it('un servicio de 45 min ocupa también la media hora siguiente', () => {
    const horas = generarHoras(LUNES, 45, horario, [ocupado], 0);
    expect(horas).not.toContain('09:30'); // 09:30-10:15 se cruza con 10:00-10:30
    expect(horas).toContain('09:00');     // 09:00-09:45 cabe
  });

  it('el servicio completo debe caber en el horario (45 min no empieza a las 18:30)', () => {
    const horas = generarHoras(LUNES, 45, horario, [], 0);
    expect(horas).toContain('18:00');
    expect(horas).not.toContain('18:30');
  });

  it('no ofrece horas que ya pasaron', () => {
    const horas = generarHoras(LUNES, 30, horario, [], ms('12:00'));
    expect(horas).not.toContain('12:00');
    expect(horas).toContain('12:30');
  });

  it('respeta el horario propio del barbero', () => {
    const propio: HorarioAtencion = { dias: [1], inicio: '13:00', fin: '15:00' };
    expect(generarHoras(LUNES, 30, propio, [], 0)).toEqual(['13:00', '13:30', '14:00', '14:30']);
  });

  it('no hay horas los días en que el barbero no atiende (domingo)', () => {
    expect(generarHoras(DOMINGO, 30, horario, [], 0)).toEqual([]);
  });

  it('validarEnHorario rechaza fuera de horario y días cerrados', () => {
    expect(validarEnHorario(ms('12:00'), 30, horario)).toBeNull();
    expect(validarEnHorario(ms('08:30'), 30, horario)).not.toBeNull();
    expect(validarEnHorario(ms('18:45'), 30, horario)).not.toBeNull();
    expect(validarEnHorario(fechaNegocio(DOMINGO, '10:00').getTime(), 30, horario)).not.toBeNull();
  });
});

describe('Zona horaria del negocio (America/Guayaquil, UTC-5)', () => {
  it('12:30 en Guayaquil equivale a 17:30 UTC', () => {
    expect(fechaNegocio('2030-06-03', '12:30').toISOString()).toBe('2030-06-03T17:30:00.000Z');
  });

  it('partesNegocio devuelve fecha, minutos del día y día de la semana en hora del negocio', () => {
    const p = partesNegocio(fechaNegocio('2030-06-03', '23:30').getTime());
    expect(p.fecha).toBe('2030-06-03');
    expect(p.minutosDelDia).toBe(23 * 60 + 30);
    expect(p.diaSemana).toBe(1); // lunes
  });

  it('hoyNegocio tiene formato AAAA-MM-DD', () => {
    expect(hoyNegocio()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});