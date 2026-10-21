import { describe, expect, it } from 'vitest';
import { parqueAbierto, validarFechaVisita } from '../../src/dominio/reglasFecha';
import { ErrorCompra } from '../../src/dominio/errores';

// Jueves 15/10/2026 a las 10:00 como "ahora" de referencia.
const AHORA = { fecha: '2026-10-15', hora: '10:00' };

describe('parqueAbierto', () => {
  it('el parque abre un día común (jueves)', () => {
    expect(parqueAbierto('2026-10-15')).toBe(true);
  });

  it('CP-19: el parque cierra los lunes', () => {
    expect(parqueAbierto('2026-10-19')).toBe(false);
  });

  it('CP-20: el parque cierra el 25 de diciembre', () => {
    expect(parqueAbierto('2026-12-25')).toBe(false);
  });

  it('CP-21: el parque cierra el 1 de enero', () => {
    expect(parqueAbierto('2027-01-01')).toBe(false);
  });
});

describe('validarFechaVisita', () => {
  it('CP-11: falla si no se indica la fecha', () => {
    expect(() => validarFechaVisita(undefined, AHORA)).toThrow(ErrorCompra);
    expect(() => validarFechaVisita('', AHORA)).toThrow('La fecha de visita es obligatoria');
  });

  it('falla si la fecha no tiene un formato válido', () => {
    expect(() => validarFechaVisita('15/10/2026', AHORA)).toThrow('La fecha de visita no es válida');
    expect(() => validarFechaVisita('2026-02-30', AHORA)).toThrow('La fecha de visita no es válida');
  });

  it('falla si la fecha no es un texto', () => {
    expect(() => validarFechaVisita(['2026-10-17'] as never, AHORA)).toThrow('La fecha de visita no es válida');
    expect(() => validarFechaVisita(20261017 as never, AHORA)).toThrow('La fecha de visita no es válida');
  });

  it('CP-12: permite comprar para hoy antes de las 17:30', () => {
    expect(() => validarFechaVisita('2026-10-15', AHORA)).not.toThrow();
  });

  it('CP-13: permite comprar para hoy exactamente a las 17:30', () => {
    expect(() => validarFechaVisita('2026-10-15', { fecha: '2026-10-15', hora: '17:30' })).not.toThrow();
  });

  it('CP-14: falla si se compra para hoy después de las 17:30', () => {
    expect(() => validarFechaVisita('2026-10-15', { fecha: '2026-10-15', hora: '17:31' })).toThrow(
      'Las entradas para el día de hoy se pueden comprar hasta las 17:30',
    );
  });

  it('CP-15: falla si la fecha es pasada', () => {
    expect(() => validarFechaVisita('2026-10-14', AHORA)).toThrow('La fecha de visita no puede ser anterior a hoy');
  });

  it('CP-16: permite una fecha futura habilitada dentro del mes', () => {
    expect(() => validarFechaVisita('2026-10-24', AHORA)).not.toThrow();
  });

  it('CP-17: permite una fecha exactamente un mes después', () => {
    // 15/11/2026 es domingo: el parque abre.
    expect(() => validarFechaVisita('2026-11-15', AHORA)).not.toThrow();
  });

  it('CP-18: falla con más de un mes de anticipación', () => {
    expect(() => validarFechaVisita('2026-11-17', AHORA)).toThrow(
      'Solo se pueden comprar entradas con hasta un mes de anticipación',
    );
  });

  it('el mes de anticipación respeta meses más cortos (31/01 → 28/02)', () => {
    const ahora = { fecha: '2027-01-31', hora: '10:00' };
    expect(() => validarFechaVisita('2027-02-28', ahora)).not.toThrow();
    expect(() => validarFechaVisita('2027-03-02', ahora)).toThrow(/un mes de anticipación/);
  });

  it('CP-19: falla si la fecha es un lunes', () => {
    expect(() => validarFechaVisita('2026-10-19', AHORA)).toThrow(
      'El parque se encuentra cerrado en la fecha seleccionada',
    );
  });

  it('CP-20: falla si la fecha es 25 de diciembre', () => {
    const ahora = { fecha: '2026-12-10', hora: '10:00' };
    expect(() => validarFechaVisita('2026-12-25', ahora)).toThrow(/cerrado/);
  });

  it('CP-21: falla si la fecha es 1 de enero', () => {
    const ahora = { fecha: '2026-12-20', hora: '10:00' };
    expect(() => validarFechaVisita('2027-01-01', ahora)).toThrow(/cerrado/);
  });
});
