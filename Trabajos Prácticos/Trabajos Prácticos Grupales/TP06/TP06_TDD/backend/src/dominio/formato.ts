/** AAAA-MM-DD → DD/MM/AAAA */
export function formatearFecha(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split('-');
  return `${dia}/${mes}/${anio}`;
}

/** 1 → "1 entrada", 3 → "3 entradas" */
export function pluralizar(cantidad: number, singular: string, plural = `${singular}s`): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

export function formatearPesos(monto: number): string {
  return `$${monto.toLocaleString('es-AR')}`;
}
