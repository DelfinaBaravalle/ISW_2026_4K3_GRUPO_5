import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

function respuesta(status: number, cuerpo: unknown) {
  return Promise.resolve(new Response(JSON.stringify(cuerpo), { status }));
}

afterEach(() => vi.unstubAllGlobals());

describe('cliente de la API', () => {
  it('envía la sesión simulada en cada pedido', async () => {
    const fetchFalso = vi.fn(() => respuesta(200, { id: 'u1' }));
    vi.stubGlobal('fetch', fetchFalso);
    await api.sesion();
    expect(fetchFalso).toHaveBeenCalledWith(
      '/api/sesion',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer sesion-demo' }) }),
    );
  });

  it('envía la solicitud de compra como JSON por POST', async () => {
    const fetchFalso = vi.fn(() => respuesta(201, {}));
    vi.stubGlobal('fetch', fetchFalso);
    await api.comprar({ fechaVisita: '2026-10-17', cantidad: 1, visitantes: [], formaPago: 'EFECTIVO' });
    expect(fetchFalso).toHaveBeenCalledWith(
      '/api/compras',
      expect.objectContaining({ method: 'POST', body: expect.stringContaining('"formaPago":"EFECTIVO"') }),
    );
  });

  it('al volver de Mercado Pago pide confirmar el pago por POST', async () => {
    const fetchFalso = vi.fn(() => respuesta(200, {}));
    vi.stubGlobal('fetch', fetchFalso);
    await api.confirmarPagoMercadoPago('123');
    expect(fetchFalso).toHaveBeenCalledWith(
      '/api/mercado-pago/pagos/123/confirmacion',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('lanza el mensaje de error que devuelve el backend', async () => {
    vi.stubGlobal('fetch', () => respuesta(400, { error: 'No podés superar las 10 entradas' }));
    await expect(api.comprar({ fechaVisita: '', cantidad: 1, visitantes: [] })).rejects.toThrow(
      'No podés superar las 10 entradas',
    );
  });

  it('lanza un mensaje genérico si el servidor no responde JSON', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('Bad gateway', { status: 502 })));
    await expect(api.calendario()).rejects.toThrow('No se pudo conectar con el servidor');
  });
});
