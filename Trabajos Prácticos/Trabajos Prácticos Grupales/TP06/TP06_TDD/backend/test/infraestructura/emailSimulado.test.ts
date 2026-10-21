import { describe, expect, it, vi } from 'vitest';
import type { EmailSaliente, ServicioEmail } from '../../src/dominio/puertos';
import { EmailSimulado } from '../../src/infraestructura/emailSimulado';

const EMAIL: EmailSaliente = { destinatario: 'visitante@ejemplo.com', asunto: 'Asunto', cuerpo: 'Cuerpo' };

describe('EmailSimulado', () => {
  it('guarda los mails en la bandeja para mostrarlos en la app', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const email = new EmailSimulado();
    await email.enviar(EMAIL);
    expect(email.enviadosA('visitante@ejemplo.com')).toEqual([expect.objectContaining(EMAIL)]);
  });

  it('con un servicio de envío real, además reenvía cada mail', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const real: ServicioEmail = { enviar: vi.fn().mockResolvedValue(undefined) };
    const email = new EmailSimulado(real);
    await email.enviar(EMAIL);
    expect(real.enviar).toHaveBeenCalledWith(EMAIL);
    expect(email.enviados).toHaveLength(1);
  });

  it('si falla el envío real, el mail queda en la bandeja y no se interrumpe la compra', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorEnLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const real: ServicioEmail = { enviar: vi.fn().mockRejectedValue(new Error('Resend respondió 500')) };
    const email = new EmailSimulado(real);
    await expect(email.enviar(EMAIL)).resolves.toBeUndefined();
    expect(email.enviados).toHaveLength(1);
    expect(errorEnLog).toHaveBeenCalledWith(expect.stringContaining('Resend respondió 500'));
  });
});
