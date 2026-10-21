import { describe, expect, it } from 'vitest';
import { calcularDetallePrecios, calcularPrecioEntrada } from '../../src/dominio/precios';

describe('calcularPrecioEntrada', () => {
  it('PU-26: pase Regular para un adulto cuesta $10.000', () => {
    expect(calcularPrecioEntrada({ edad: 30, tipoPase: 'REGULAR' })).toBe(10000);
  });

  it('PU-27: pase VIP para un adulto cuesta $20.000', () => {
    expect(calcularPrecioEntrada({ edad: 30, tipoPase: 'VIP' })).toBe(20000);
  });

  it('PU-28: un visitante de 3 años no paga', () => {
    expect(calcularPrecioEntrada({ edad: 3, tipoPase: 'REGULAR' })).toBe(0);
    expect(calcularPrecioEntrada({ edad: 0, tipoPase: 'VIP' })).toBe(0);
  });

  it('PU-29: un visitante de 4 años paga 50%', () => {
    expect(calcularPrecioEntrada({ edad: 4, tipoPase: 'REGULAR' })).toBe(5000);
  });

  it('PU-30: un visitante de 15 años paga 50%', () => {
    expect(calcularPrecioEntrada({ edad: 15, tipoPase: 'REGULAR' })).toBe(5000);
  });

  it('PU-31: un visitante de 16 años paga el precio completo', () => {
    expect(calcularPrecioEntrada({ edad: 16, tipoPase: 'REGULAR' })).toBe(10000);
  });

  it('PU-32: un visitante de 59 años paga el precio completo', () => {
    expect(calcularPrecioEntrada({ edad: 59, tipoPase: 'REGULAR' })).toBe(10000);
  });

  it('PU-33: un visitante de 60 años paga 50%', () => {
    expect(calcularPrecioEntrada({ edad: 60, tipoPase: 'REGULAR' })).toBe(5000);
  });

  it('PU-34: el descuento por edad también se aplica al pase VIP', () => {
    expect(calcularPrecioEntrada({ edad: 15, tipoPase: 'VIP' })).toBe(10000);
  });
});

describe('calcularDetallePrecios', () => {
  it('PU-35: calcula el subtotal de cada entrada y el total', () => {
    const detalle = calcularDetallePrecios([
      { edad: 3, tipoPase: 'REGULAR' },
      { edad: 10, tipoPase: 'REGULAR' },
      { edad: 30, tipoPase: 'REGULAR' },
    ]);
    expect(detalle.entradas.map((e) => e.precio)).toEqual([0, 5000, 10000]);
    expect(detalle.total).toBe(15000);
  });

  it('informa el precio base y el descuento aplicado a cada entrada', () => {
    const detalle = calcularDetallePrecios([{ edad: 65, tipoPase: 'VIP' }]);
    expect(detalle.entradas[0]).toEqual({
      edad: 65,
      tipoPase: 'VIP',
      precioBase: 20000,
      porcentajeDescuento: 50,
      precio: 10000,
    });
  });
});
