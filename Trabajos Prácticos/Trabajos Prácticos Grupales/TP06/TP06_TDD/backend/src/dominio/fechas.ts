/**
 * Utilidades para trabajar con fechas de calendario en formato ISO (AAAA-MM-DD)
 * sin depender de la zona horaria de la máquina.
 */

const FORMATO_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export const DOMINGO = 0;
export const LUNES = 1;

export function aFechaUTC(fecha: string): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

export function aFechaISO(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export function esFechaISOValida(fecha: string): boolean {
  if (!FORMATO_FECHA_ISO.test(fecha)) return false;
  return aFechaISO(aFechaUTC(fecha)) === fecha;
}

export function sumarDias(fecha: string, dias: number): string {
  const d = aFechaUTC(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return aFechaISO(d);
}

/** Mismo día del mes siguiente; si no existe (ej. 31/01), el último día de ese mes. */
export function sumarUnMes(fecha: string): string {
  const d = aFechaUTC(fecha);
  const anio = d.getUTCFullYear();
  const mesSiguiente = d.getUTCMonth() + 1;
  const ultimoDiaMesSiguiente = new Date(Date.UTC(anio, mesSiguiente + 1, 0)).getUTCDate();
  return aFechaISO(new Date(Date.UTC(anio, mesSiguiente, Math.min(d.getUTCDate(), ultimoDiaMesSiguiente))));
}
