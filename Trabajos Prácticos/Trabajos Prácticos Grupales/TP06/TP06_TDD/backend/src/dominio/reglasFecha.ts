import { ErrorCompra } from './errores';
import { aFechaUTC, esFechaISOValida, LUNES, sumarUnMes } from './fechas';

/** Momento actual expresado en la zona horaria del parque. */
export interface Instante {
  fecha: string; // AAAA-MM-DD
  hora: string; // HH:mm
}

export const HORA_LIMITE_COMPRA_MISMO_DIA = '17:30';

/** Feriados en los que el parque no abre, en formato MM-DD. */
const FERIADOS_CERRADO = ['12-25', '01-01'];

export function parqueAbierto(fecha: string): boolean {
  if (aFechaUTC(fecha).getUTCDay() === LUNES) return false;
  return !FERIADOS_CERRADO.includes(fecha.slice(5));
}

export function fechaMaximaDeCompra(ahora: Instante): string {
  return sumarUnMes(ahora.fecha);
}

export function validarFechaVisita(fecha: string | undefined, ahora: Instante): void {
  if (!fecha) throw new ErrorCompra('La fecha de visita es obligatoria');
  if (typeof fecha !== 'string' || !esFechaISOValida(fecha)) throw new ErrorCompra('La fecha de visita no es válida');

  if (fecha < ahora.fecha) {
    throw new ErrorCompra('La fecha de visita no puede ser anterior a hoy');
  }
  if (fecha === ahora.fecha && ahora.hora > HORA_LIMITE_COMPRA_MISMO_DIA) {
    throw new ErrorCompra(
      `Las entradas para el día de hoy se pueden comprar hasta las ${HORA_LIMITE_COMPRA_MISMO_DIA}`,
    );
  }
  if (fecha > fechaMaximaDeCompra(ahora)) {
    throw new ErrorCompra('Solo se pueden comprar entradas con hasta un mes de anticipación');
  }
  if (!parqueAbierto(fecha)) {
    throw new ErrorCompra('El parque se encuentra cerrado en la fecha seleccionada');
  }
}
