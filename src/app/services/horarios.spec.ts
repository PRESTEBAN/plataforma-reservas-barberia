import { fechaATexto, generarHorarios, haySolape } from './horarios';

// Pruebas de la regla central: un barbero no puede tener dos reservas activas que se crucen.
describe('Regla de disponibilidad (horarios.ts)', () => {
  // Un lunes futuro (día abierto) y el domingo siguiente (día cerrado)
  const lunes = new Date();
  lunes.setDate(lunes.getDate() + ((8 - lunes.getDay()) % 7 || 7) + 7);
  const fechaLunes = fechaATexto(lunes);
  const domingo = new Date(lunes);
  domingo.setDate(domingo.getDate() + 6);

  const ms = (hora: string) => new Date(fechaLunes + 'T' + hora).getTime();
  const ocupado = { inicio: ms('10:00'), fin: ms('10:30') };

  it('detecta cruce: 10:15-10:45 contra 10:00-10:30', () => {
    expect(haySolape(ms('10:15'), ms('10:45'), [ocupado])).toBe(true);
  });

  it('permite empezar justo cuando termina otra: 10:30-11:00', () => {
    expect(haySolape(ms('10:30'), ms('11:00'), [ocupado])).toBe(false);
  });

  it('no hay cruce con otro horario del día', () => {
    expect(haySolape(ms('14:00'), ms('14:30'), [ocupado])).toBe(false);
  });

  it('las horas libres excluyen las que se cruzan con una reserva', () => {
    const horas = generarHorarios(fechaLunes, 30, '09:00', '19:00', [ocupado], 0);
    expect(horas).not.toContain('10:00');
    expect(horas).toContain('09:30');
    expect(horas).toContain('10:30');
  });

  it('el servicio completo debe caber en el horario (45 min no empieza a las 18:30)', () => {
    const horas = generarHorarios(fechaLunes, 45, '09:00', '19:00', [], 0);
    expect(horas).toContain('18:00');
    expect(horas).not.toContain('18:30');
  });

  it('no ofrece horas que ya pasaron', () => {
    const horas = generarHorarios(fechaLunes, 30, '09:00', '19:00', [], ms('12:00'));
    expect(horas).not.toContain('12:00');
    expect(horas).toContain('12:30');
  });

  it('respeta el horario propio del barbero', () => {
    const horas = generarHorarios(fechaLunes, 30, '13:00', '15:00', [], 0);
    expect(horas).toEqual(['13:00', '13:30', '14:00', '14:30']);
  });

  it('no hay horas los domingos (día cerrado)', () => {
    expect(generarHorarios(fechaATexto(domingo), 30, '09:00', '19:00', [], 0)).toEqual([]);
  });
});