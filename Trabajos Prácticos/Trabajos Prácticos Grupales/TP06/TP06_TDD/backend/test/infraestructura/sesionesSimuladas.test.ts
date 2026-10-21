import { afterEach, describe, expect, it, vi } from 'vitest';
import { usuarioDeSesion } from '../../src/infraestructura/sesionesSimuladas';

describe('usuarioDeSesion', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('con EMAIL_USUARIO_DEMO el usuario de demo usa esa casilla para recibir los mails reales', () => {
    vi.stubEnv('EMAIL_USUARIO_DEMO', 'casilla@real.com');
    expect(usuarioDeSesion('Bearer sesion-demo')?.email).toBe('casilla@real.com');
    expect(usuarioDeSesion('Bearer sesion-mail-invalido')?.email).toBe('visitante.ejemplo.com');
  });

  it('devuelve el usuario de una sesión válida', () => {
    expect(usuarioDeSesion('Bearer sesion-demo')?.email).toBe('visitante@ejemplo.com');
  });

  it('devuelve null sin cabecera o con un token desconocido', () => {
    expect(usuarioDeSesion(undefined)).toBeNull();
    expect(usuarioDeSesion('Bearer cualquiera')).toBeNull();
  });

  it('no acepta nombres de propiedades internas de JavaScript como token', () => {
    expect(usuarioDeSesion('Bearer toString')).toBeNull();
    expect(usuarioDeSesion('Bearer constructor')).toBeNull();
    expect(usuarioDeSesion('Bearer __proto__')).toBeNull();
  });
});
