import { describe, expect, it, vi } from 'vitest';
import { MercadoPagoCheckoutPro } from '../../src/infraestructura/mercadoPagoCheckoutPro';

const PREFERENCIA = { init_point: 'https://mp.test/checkout', sandbox_init_point: 'https://sandbox.mp.test/checkout' };

function respuestaJson(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });
}

function crearPasarela(respuesta: Response | Error, cambios: { accessToken?: string; urlFrontend?: string } = {}) {
  const fetchFalso = vi.fn<typeof fetch>();
  if (respuesta instanceof Error) fetchFalso.mockRejectedValue(respuesta);
  else fetchFalso.mockResolvedValue(respuesta);
  const pasarela = new MercadoPagoCheckoutPro({
    accessToken: 'APP_USR-token',
    urlFrontend: 'http://localhost:5173',
    fetch: fetchFalso,
    ...cambios,
  });
  return { pasarela, fetchFalso };
}

function pedidoEnviado(fetchFalso: ReturnType<typeof crearPasarela>['fetchFalso']) {
  const [url, opciones] = fetchFalso.mock.calls[0];
  return { url, opciones: opciones as RequestInit & { headers: Record<string, string>; body: string } };
}

describe('MercadoPagoCheckoutPro', () => {
  describe('crear el pago', () => {
    it('crea una preferencia por el total de la compra y devuelve la URL del checkout', async () => {
      const { pasarela, fetchFalso } = crearPasarela(respuestaJson(PREFERENCIA));
      const { urlPago } = await pasarela.crearPago('000001', 15000);
      expect(urlPago).toBe('https://mp.test/checkout');

      const { url, opciones } = pedidoEnviado(fetchFalso);
      expect(url).toBe('https://api.mercadopago.com/checkout/preferences');
      expect(opciones.method).toBe('POST');
      expect(opciones.headers.Authorization).toBe('Bearer APP_USR-token');
      const preferencia = JSON.parse(opciones.body);
      expect(preferencia.items).toEqual([
        expect.objectContaining({ quantity: 1, unit_price: 15000, currency_id: 'ARS' }),
      ]);
      expect(preferencia.external_reference).toBe('000001');
      expect(preferencia.back_urls).toEqual({
        success: 'http://localhost:5173/pago/retorno?compra=000001',
        failure: 'http://localhost:5173/pago/retorno?compra=000001',
        pending: 'http://localhost:5173/pago/retorno?compra=000001',
      });
    });

    it('solo pide el retorno automático al sitio si la URL del front es https', async () => {
      const local = crearPasarela(respuestaJson(PREFERENCIA));
      await local.pasarela.crearPago('000001', 15000);
      expect(JSON.parse(pedidoEnviado(local.fetchFalso).opciones.body).auto_return).toBeUndefined();

      const publica = crearPasarela(respuestaJson(PREFERENCIA), { urlFrontend: 'https://ecoharmony.test' });
      await publica.pasarela.crearPago('000001', 15000);
      expect(JSON.parse(pedidoEnviado(publica.fetchFalso).opciones.body).auto_return).toBe('approved');
    });

    it('con credenciales TEST- usa el checkout del sandbox', async () => {
      const { pasarela } = crearPasarela(respuestaJson(PREFERENCIA), { accessToken: 'TEST-token' });
      expect((await pasarela.crearPago('000001', 15000)).urlPago).toBe('https://sandbox.mp.test/checkout');
    });

    it('informa un error de la pasarela si Mercado Pago rechaza la solicitud', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { pasarela } = crearPasarela(respuestaJson({ message: 'invalid access token' }, 401));
      await expect(pasarela.crearPago('000001', 15000)).rejects.toMatchObject({
        tipo: 'PASARELA',
        message: 'No se pudo conectar con Mercado Pago. Intentá de nuevo en unos minutos',
      });
    });

    it('informa un error de la pasarela si no hay conexión con Mercado Pago', async () => {
      const { pasarela } = crearPasarela(new TypeError('fetch failed'));
      await expect(pasarela.crearPago('000001', 15000)).rejects.toMatchObject({ tipo: 'PASARELA' });
    });
  });

  describe('consultar el pago', () => {
    it('consulta el pago por su id y devuelve la compra asociada', async () => {
      const { pasarela, fetchFalso } = crearPasarela(
        respuestaJson({ status: 'approved', external_reference: '000001' }),
      );
      expect(await pasarela.consultarPago('123')).toEqual({ compraId: '000001', estado: 'APROBADO' });
      const { url, opciones } = pedidoEnviado(fetchFalso);
      expect(url).toBe('https://api.mercadopago.com/v1/payments/123');
      expect(opciones.headers.Authorization).toBe('Bearer APP_USR-token');
    });

    it('traduce los estados de Mercado Pago a aprobado, rechazado o pendiente', async () => {
      const estadoDe = async (status: string) =>
        (await crearPasarela(respuestaJson({ status, external_reference: '000001' })).pasarela.consultarPago('1'))
          .estado;
      expect(await estadoDe('approved')).toBe('APROBADO');
      expect(await estadoDe('rejected')).toBe('RECHAZADO');
      expect(await estadoDe('cancelled')).toBe('RECHAZADO');
      expect(await estadoDe('pending')).toBe('PENDIENTE');
      expect(await estadoDe('in_process')).toBe('PENDIENTE');
    });

    it('falla si el pago no existe', async () => {
      const { pasarela } = crearPasarela(respuestaJson({ message: 'Payment not found' }, 404));
      await expect(pasarela.consultarPago('123')).rejects.toMatchObject({
        tipo: 'NO_ENCONTRADO',
        message: 'El pago no existe',
      });
    });

    it('no consulta a Mercado Pago con un id de pago inválido', async () => {
      const { pasarela, fetchFalso } = crearPasarela(respuestaJson({}));
      await expect(pasarela.consultarPago('../preferences')).rejects.toThrow('El pago no existe');
      expect(fetchFalso).not.toHaveBeenCalled();
    });
  });
});
