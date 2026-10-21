import { crearApp } from './api/app';
import { EmailResend } from './infraestructura/emailResend';
import { EmailSimulado } from './infraestructura/emailSimulado';
import { MercadoPagoCheckoutPro } from './infraestructura/mercadoPagoCheckoutPro';
import { MercadoPagoSimulado } from './infraestructura/mercadoPagoSimulado';

try {
  process.loadEnvFile();
} catch {
  // Sin archivo .env: se usan los valores por defecto (Mercado Pago simulado).
}

const PUERTO = Number(process.env.PORT ?? 3001);
const {
  MP_ACCESS_TOKEN,
  FRONTEND_URL = 'http://localhost:5173',
  RESEND_API_KEY,
  EMAIL_REMITENTE,
  EMAIL_USUARIO_DEMO,
} = process.env;

const pasarela = MP_ACCESS_TOKEN
  ? new MercadoPagoCheckoutPro({ accessToken: MP_ACCESS_TOKEN, urlFrontend: FRONTEND_URL })
  : new MercadoPagoSimulado();

// La bandeja simulada se mantiene siempre: la app la usa para mostrar el mail enviado.
const email = new EmailSimulado(
  RESEND_API_KEY
    ? // Un EMAIL_REMITENTE vacío en el .env se toma como no configurado.
      new EmailResend({ apiKey: RESEND_API_KEY, remitente: EMAIL_REMITENTE || undefined })
    : undefined,
);

crearApp({ pasarela, email }).listen(PUERTO, () => {
  console.log(`🌿 API de EcoHarmony Park escuchando en http://localhost:${PUERTO}`);
  console.log(MP_ACCESS_TOKEN ? '💳 Pagos con Mercado Pago (Checkout Pro)' : '💳 Pagos con Mercado Pago simulado');
  console.log(
    RESEND_API_KEY
      ? `📧 Mails con Resend${EMAIL_USUARIO_DEMO ? ` (usuario de demo: ${EMAIL_USUARIO_DEMO})` : ''}`
      : '📧 Mails simulados',
  );
});
