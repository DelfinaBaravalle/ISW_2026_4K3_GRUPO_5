export const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** AAAA-MM-DD → "sábado 17 de octubre" */
export function formatearFechaLarga(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  const nombreDia = new Date(Date.UTC(anio, mes - 1, dia)).toLocaleDateString('es-AR', {
    weekday: 'long',
    timeZone: 'UTC',
  });
  return `${nombreDia} ${dia} de ${MESES[mes - 1]}`;
}

/** 1 → "1 entrada", 3 → "3 entradas" */
export function pluralizar(cantidad: number, singular: string, plural = `${singular}s`): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

export function formatearPesos(monto: number): string {
  return `$${monto.toLocaleString('es-AR')}`;
}

export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
