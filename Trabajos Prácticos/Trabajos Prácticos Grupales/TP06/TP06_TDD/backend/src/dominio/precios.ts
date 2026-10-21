import type { TipoPase, Visitante } from './tipos';

export const PRECIOS_BASE: Record<TipoPase, number> = {
  REGULAR: 10000,
  VIP: 20000,
};

export interface EntradaCotizada extends Visitante {
  precioBase: number;
  porcentajeDescuento: number;
  precio: number;
}

export interface DetallePrecios {
  entradas: EntradaCotizada[];
  total: number;
}

/** Descuento por edad: hasta 3 años no pagan; de 4 a 15 y desde 60, 50%. */
export function porcentajeDescuentoPorEdad(edad: number): number {
  if (edad <= 3) return 100;
  if (edad <= 15) return 50;
  if (edad >= 60) return 50;
  return 0;
}

export function calcularPrecioEntrada(visitante: Visitante): number {
  return cotizarEntrada(visitante).precio;
}

function cotizarEntrada({ edad, tipoPase }: Visitante): EntradaCotizada {
  const precioBase = PRECIOS_BASE[tipoPase];
  const porcentajeDescuento = porcentajeDescuentoPorEdad(edad);
  const precio = (precioBase * (100 - porcentajeDescuento)) / 100;
  return { edad, tipoPase, precioBase, porcentajeDescuento, precio };
}

export function calcularDetallePrecios(visitantes: readonly Visitante[]): DetallePrecios {
  const entradas = visitantes.map(cotizarEntrada);
  const total = entradas.reduce((suma, entrada) => suma + entrada.precio, 0);
  return { entradas, total };
}
