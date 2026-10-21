import { describe, expect, it } from 'vitest';
import { plantillaEmailHtml } from '../../src/infraestructura/plantillaEmailHtml';

const CUERPO = [
  '¡Tu compra fue confirmada! Presentá estos códigos al ingresar al parque.',
  '',
  'Orden: 000002',
  'Fecha de visita: 23/10/2026',
  'Cantidad de entradas: 2',
  '- EHP-000002-1 | Pase Regular | 23 años | $10.000',
  '- EHP-000002-2 | Pase VIP | 22 años | $20.000',
  'Total: $30.000',
].join('\n');

describe('plantillaEmailHtml', () => {
  it('muestra el encabezado y los datos de la compra', () => {
    const html = plantillaEmailHtml('Confirmación de compra - EcoHarmony Park', CUERPO);
    expect(html).toContain('¡Tu compra fue confirmada!');
    expect(html).toMatch(/Orden<\/td>\s*<td[^>]*>000002/);
    expect(html).toMatch(/Fecha de visita<\/td>\s*<td[^>]*>23\/10\/2026/);
    expect(html).toMatch(/Total<\/td>\s*<td[^>]*>\$30\.000/);
  });

  it('arma una fila por entrada con código, pase, edad y precio', () => {
    const html = plantillaEmailHtml('Confirmación', CUERPO);
    expect(html).toMatch(
      /EHP-000002-1<\/td>\s*<td[^>]*>Pase Regular<\/td>\s*<td[^>]*>23 años<\/td>\s*<td[^>]*>\$10\.000/,
    );
    expect(html).toContain('EHP-000002-2');
  });

  it('escapa el texto para que no se interprete como HTML', () => {
    const html = plantillaEmailHtml('<b>Asunto</b>', 'Hola <script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;b&gt;Asunto&lt;/b&gt;');
  });
});
