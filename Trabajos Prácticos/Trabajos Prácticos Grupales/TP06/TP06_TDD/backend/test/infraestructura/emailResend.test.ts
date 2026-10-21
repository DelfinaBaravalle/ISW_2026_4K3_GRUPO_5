import { describe, expect, it, vi } from 'vitest';
import type { EmailSaliente } from '../../src/dominio/puertos';
import { EmailResend } from '../../src/infraestructura/emailResend';

const EMAIL: EmailSaliente = {
  destinatario: 'visitante@ejemplo.com',
  asunto: 'Confirmación de compra - EcoHarmony Park',
  cuerpo: '¡Tu compra fue confirmada!\n\nOrden: 000001\nTotal: $10.000',
};

function respuestaJson(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });
}

function crearEmail(respuesta: Response) {
  const fetchFalso = vi.fn<typeof fetch>().mockResolvedValue(respuesta);
  const email = new EmailResend({ apiKey: 're_clave', fetch: fetchFalso });
  return { email, fetchFalso };
}

function pedidoEnviado(fetchFalso: ReturnType<typeof crearEmail>['fetchFalso']) {
  const [url, opciones] = fetchFalso.mock.calls[0];
  const { headers, body } = opciones as RequestInit & { headers: Record<string, string>; body: string };
  return { url, headers, cuerpo: JSON.parse(body) };
}

describe('EmailResend', () => {
  it('envía el mail por la API de Resend con versión en texto y en HTML', async () => {
    const { email, fetchFalso } = crearEmail(respuestaJson({ id: 'mail-1' }));
    await email.enviar(EMAIL);

    const { url, headers, cuerpo } = pedidoEnviado(fetchFalso);
    expect(url).toBe('https://api.resend.com/emails');
    expect(headers.Authorization).toBe('Bearer re_clave');
    expect(cuerpo).toMatchObject({
      from: 'EcoHarmony Park <onboarding@resend.dev>',
      to: ['visitante@ejemplo.com'],
      subject: 'Confirmación de compra - EcoHarmony Park',
      text: EMAIL.cuerpo,
    });
    expect(cuerpo.html).toContain('Orden');
    expect(cuerpo.html).toContain('$10.000');
  });

  it('falla con el mensaje de Resend si rechaza el envío', async () => {
    const { email } = crearEmail(
      respuestaJson({ statusCode: 403, message: 'You can only send testing emails to your own email address' }, 403),
    );
    await expect(email.enviar(EMAIL)).rejects.toThrow(
      'Resend respondió 403: You can only send testing emails to your own email address',
    );
  });
});
