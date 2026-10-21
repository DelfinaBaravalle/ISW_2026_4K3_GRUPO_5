import type { EmailSaliente, ServicioEmail } from '../dominio/puertos';

/**
 * Bandeja de salida simulada: guarda los mails en memoria para mostrarlos en la app.
 * Si recibe un servicio de envío real (por ejemplo, Resend), además reenvía cada mail.
 */
export class EmailSimulado implements ServicioEmail {
  readonly enviados: (EmailSaliente & { enviadoEn: string })[] = [];

  constructor(private readonly envioReal?: ServicioEmail) {}

  async enviar(email: EmailSaliente): Promise<void> {
    this.enviados.push({ ...email, enviadoEn: new Date().toISOString() });
    console.log(`📧 Mail simulado enviado a ${email.destinatario}: ${email.asunto}`);
    if (!this.envioReal) return;
    try {
      await this.envioReal.enviar(email);
    } catch (error) {
      // La compra ya se registró: un error del proveedor de mails no la interrumpe.
      console.error(`No se pudo enviar el mail real a ${email.destinatario}: ${(error as Error).message}`);
    }
  }

  enviadosA(destinatario: string) {
    return this.enviados.filter((e) => e.destinatario === destinatario);
  }
}
