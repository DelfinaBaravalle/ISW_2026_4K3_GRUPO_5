import type { EmailSaliente, ServicioEmail } from '../dominio/puertos';
import { plantillaEmailHtml } from './plantillaEmailHtml';

const API_RESEND = 'https://api.resend.com/emails';
/** Remitente que Resend habilita para pruebas, sin verificar un dominio propio. */
const REMITENTE_DE_PRUEBA = 'EcoHarmony Park <onboarding@resend.dev>';

interface ConfiguracionResend {
  apiKey: string;
  remitente?: string;
  fetch?: typeof fetch;
}

/** Envío real de mails mediante la API de Resend. */
export class EmailResend implements ServicioEmail {
  constructor(private readonly configuracion: ConfiguracionResend) {}

  async enviar({ destinatario, asunto, cuerpo }: EmailSaliente): Promise<void> {
    const { apiKey, remitente = REMITENTE_DE_PRUEBA } = this.configuracion;
    const hacerPedido = this.configuracion.fetch ?? fetch;
    const respuesta = await hacerPedido(API_RESEND, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: remitente,
        to: [destinatario],
        subject: asunto,
        text: cuerpo,
        html: plantillaEmailHtml(asunto, cuerpo),
      }),
    });
    if (!respuesta.ok) {
      const { message } = await respuesta.json().catch(() => ({ message: 'sin detalle' }));
      throw new Error(`Resend respondió ${respuesta.status}: ${message}`);
    }
  }
}
