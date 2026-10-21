import type { Usuario } from '../dominio/tipos';

/**
 * Registro e inicio de sesión quedan fuera del alcance de la US (FAQ 19):
 * se simulan con tokens fijos asociados a usuarios ya registrados.
 */
const SESIONES: Record<string, Usuario> = {
  'sesion-demo': { id: 'u1', nombre: 'Camila', email: 'visitante@ejemplo.com' },
  'sesion-mail-invalido': { id: 'u2', nombre: 'Visitante con mail inválido', email: 'visitante.ejemplo.com' },
};

export function usuarioDeSesion(cabeceraAutorizacion: string | undefined): Usuario | null {
  const token = cabeceraAutorizacion?.replace(/^Bearer\s+/i, '');
  if (!token || !Object.hasOwn(SESIONES, token)) return null;
  // Para recibir los mails reales (Resend), el usuario de demo puede usar una casilla propia.
  // Se lee en cada pedido porque el .env se carga después de importar este módulo.
  const emailDemo = process.env.EMAIL_USUARIO_DEMO;
  return token === 'sesion-demo' && emailDemo ? { ...SESIONES[token], email: emailDemo } : SESIONES[token];
}
