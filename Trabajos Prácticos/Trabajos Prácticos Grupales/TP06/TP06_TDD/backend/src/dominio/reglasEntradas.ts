import { ErrorCompra } from './errores';
import { TIPOS_PASE, type Visitante, type VisitanteSinValidar } from './tipos';

export const MAXIMO_ENTRADAS_POR_FECHA = 10;
export const EDAD_MAXIMA = 120;

export function validarCantidad(cantidad: unknown): asserts cantidad is number {
  if (cantidad === undefined || cantidad === null || cantidad === '') {
    throw new ErrorCompra('La cantidad de entradas es obligatoria');
  }
  if (typeof cantidad !== 'number' || Number.isNaN(cantidad)) {
    throw new ErrorCompra('La cantidad de entradas debe ser un número entero');
  }
  if (cantidad <= 0) throw new ErrorCompra('La cantidad de entradas debe ser mayor a cero');
  if (!Number.isInteger(cantidad)) throw new ErrorCompra('La cantidad de entradas debe ser un número entero');
  if (cantidad > MAXIMO_ENTRADAS_POR_FECHA) {
    throw new ErrorCompra(`No se pueden comprar más de ${MAXIMO_ENTRADAS_POR_FECHA} entradas para una misma fecha`);
  }
}

export function validarVisitantes(
  visitantes: readonly VisitanteSinValidar[] | undefined,
  cantidad: number,
): asserts visitantes is Visitante[] {
  if (!Array.isArray(visitantes) || visitantes.length !== cantidad) {
    throw new ErrorCompra('Se debe informar la edad de cada visitante');
  }
  for (const visitante of visitantes) {
    const { edad, tipoPase } = visitante ?? {};
    if (edad === undefined || edad === null || edad === '') {
      throw new ErrorCompra('Se debe informar la edad de cada visitante');
    }
    if (typeof edad !== 'number' || !Number.isInteger(edad)) {
      throw new ErrorCompra('La edad de los visitantes debe ser un número entero');
    }
    if (edad < 0) throw new ErrorCompra('La edad de los visitantes no puede ser negativa');
    if (edad > EDAD_MAXIMA) {
      throw new ErrorCompra(`La edad de los visitantes no puede ser mayor a ${EDAD_MAXIMA} años`);
    }
    if (!TIPOS_PASE.includes(tipoPase as never)) {
      throw new ErrorCompra('Se debe seleccionar el tipo de pase (Regular o VIP) de cada visitante');
    }
  }
}
