/**
 * Versión HTML del mail con el resumen de compra, armada a partir del cuerpo en texto que genera el dominio:
 * un encabezado, líneas "Dato: valor" y una línea "- código | pase | edad | precio" por entrada.
 * Los estilos van en línea porque los clientes de correo ignoran las hojas de estilo.
 */

const VERDE_BOSQUE = '#386641';
const CREMA = '#F2E8CF';
const TEXTO = '#1f2a1f';
const CELDA = 'padding:8px 12px;border-bottom:1px solid #e4dcc4;';

const LINEA_ENTRADA = /^- (.+)$/;
const LINEA_DATO = /^([^:]+): (.+)$/;

export function plantillaEmailHtml(asunto: string, cuerpo: string): string {
  const [encabezado, ...resto] = cuerpo.split('\n\n');
  const datos: string[] = [];
  const entradas: string[] = [];
  const notas: string[] = [];
  let total = '';

  for (const linea of resto.join('\n').split('\n').filter(Boolean)) {
    const entrada = linea.match(LINEA_ENTRADA);
    const dato = linea.match(LINEA_DATO);
    if (entrada) {
      const celdas = entrada[1].split(' | ').map((c) => `<td style="${CELDA}">${escapar(c)}</td>`);
      entradas.push(`<tr>${celdas.join('')}</tr>`);
    } else if (dato?.[1] === 'Total') {
      total = filaDato(dato[1], dato[2], 'font-weight:700;font-size:16px;');
    } else if (dato) {
      datos.push(filaDato(dato[1], dato[2]));
    } else {
      notas.push(`<p style="margin:16px 0 0;color:#6b6b6b;font-size:12px;">${escapar(linea)}</p>`);
    }
  }

  return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background:${CREMA};font-family:Lato,Arial,sans-serif;color:${TEXTO};">
  <table role="presentation" width="100%" style="max-width:600px;margin:auto;background:#ffffff;border-radius:8px;border-collapse:collapse;">
    <tr><td style="padding:20px 24px;background:${VERDE_BOSQUE};color:#ffffff;font-size:20px;font-weight:700;border-radius:8px 8px 0 0;">EcoHarmony Park</td></tr>
    <tr><td style="padding:24px;">
      <h1 style="margin:0 0 8px;font-size:18px;color:${VERDE_BOSQUE};">${escapar(asunto)}</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.5;">${escapar(encabezado)}</p>
      <table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px;">${datos.join('')}</table>
      ${entradas.length ? `<h2 style="margin:24px 0 8px;font-size:16px;color:${VERDE_BOSQUE};">Tus entradas</h2><table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px;">${entradas.join('')}</table>` : ''}
      <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:16px;">${total}</table>
      ${notas.join('')}
    </td></tr>
  </table>
</body>
</html>`;
}

function filaDato(clave: string, valor: string, estilo = '') {
  return `<tr><td style="${CELDA}color:#6b6b6b;${estilo}">${escapar(clave)}</td>
<td style="${CELDA}text-align:right;${estilo}">${escapar(valor)}</td></tr>`;
}

function escapar(texto: string): string {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
