import { describe, expect, it } from 'vitest';
import { validarCantidad, validarVisitantes } from '../../src/dominio/reglasEntradas';

describe('validarCantidad', () => {
  it('CP-01: falla si no se indica la cantidad', () => {
    expect(() => validarCantidad(undefined)).toThrow('La cantidad de entradas es obligatoria');
  });

  it('CP-02: falla si la cantidad es 0', () => {
    expect(() => validarCantidad(0)).toThrow('La cantidad de entradas debe ser mayor a cero');
  });

  it('CP-03: falla si la cantidad es negativa', () => {
    expect(() => validarCantidad(-1)).toThrow('La cantidad de entradas debe ser mayor a cero');
  });

  it('CP-04: falla si la cantidad es decimal', () => {
    expect(() => validarCantidad(2.5)).toThrow('La cantidad de entradas debe ser un número entero');
  });

  it('falla si la cantidad no es un número', () => {
    expect(() => validarCantidad('2')).toThrow('La cantidad de entradas debe ser un número entero');
  });

  it('CP-05: permite comprar 1 entrada', () => {
    expect(() => validarCantidad(1)).not.toThrow();
  });

  it('CP-06: permite comprar 10 entradas en una transacción', () => {
    expect(() => validarCantidad(10)).not.toThrow();
  });

  it('CP-07: falla si se piden 11 entradas', () => {
    expect(() => validarCantidad(11)).toThrow('No se pueden comprar más de 10 entradas para una misma fecha');
  });
});

describe('validarVisitantes', () => {
  it('CP-22: permite informar la edad y el pase de todos los visitantes', () => {
    const visitantes = [
      { edad: 8, tipoPase: 'REGULAR' as const },
      { edad: 30, tipoPase: 'VIP' as const },
      { edad: 65, tipoPase: 'REGULAR' as const },
    ];
    expect(() => validarVisitantes(visitantes, 3)).not.toThrow();
  });

  it('CP-23: falla si falta la edad de un visitante', () => {
    const visitantes = [
      { edad: 8, tipoPase: 'REGULAR' as const },
      { edad: 30, tipoPase: 'REGULAR' as const },
    ];
    expect(() => validarVisitantes(visitantes, 3)).toThrow('Se debe informar la edad de cada visitante');
    expect(() => validarVisitantes([{ edad: undefined, tipoPase: 'REGULAR' }], 1)).toThrow(
      'Se debe informar la edad de cada visitante',
    );
  });

  it('CP-24: falla si una edad es negativa', () => {
    expect(() => validarVisitantes([{ edad: -1, tipoPase: 'REGULAR' }], 1)).toThrow(
      'La edad de los visitantes no puede ser negativa',
    );
  });

  it('falla si una edad no es un número entero', () => {
    expect(() => validarVisitantes([{ edad: 4.5, tipoPase: 'REGULAR' }], 1)).toThrow(
      'La edad de los visitantes debe ser un número entero',
    );
  });

  it('falla si una edad supera los 120 años', () => {
    expect(() => validarVisitantes([{ edad: 121, tipoPase: 'REGULAR' }], 1)).toThrow(
      'La edad de los visitantes no puede ser mayor a 120 años',
    );
    expect(() => validarVisitantes([{ edad: 120, tipoPase: 'REGULAR' }], 1)).not.toThrow();
  });

  it('falla si un visitante viene vacío (null)', () => {
    expect(() => validarVisitantes([null as never], 1)).toThrow('Se debe informar la edad de cada visitante');
  });

  it('falla si los visitantes no son una lista', () => {
    expect(() => validarVisitantes({ length: 1 } as never, 1)).toThrow('Se debe informar la edad de cada visitante');
  });

  it('CP-25: falla si no se selecciona el tipo de pase', () => {
    expect(() => validarVisitantes([{ edad: 30, tipoPase: undefined }], 1)).toThrow(
      'Se debe seleccionar el tipo de pase (Regular o VIP) de cada visitante',
    );
  });

  it('falla si el tipo de pase no existe', () => {
    expect(() => validarVisitantes([{ edad: 30, tipoPase: 'PLATINO' }], 1)).toThrow(/tipo de pase/);
  });
});
