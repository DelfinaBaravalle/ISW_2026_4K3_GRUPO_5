import { ErrorCompra } from '../dominio/errores';
import type { EstadoPagoExterno, PagoExterno, PasarelaPago } from '../dominio/puertos';

const API_MERCADO_PAGO = 'https://api.mercadopago.com';
const ID_PAGO_VALIDO = /^\d+$/;

/** Estados de Mercado Pago que cierran el pago. El resto (pending, in_process, authorized…) sigue pendiente. */
const ESTADOS_FINALES: Record<string, EstadoPagoExterno> = {
  approved: 'APROBADO',
  rejected: 'RECHAZADO',
  cancelled: 'RECHAZADO',
  refunded: 'RECHAZADO',
  charged_back: 'RECHAZADO',
};

interface ConfiguracionMercadoPago {
  accessToken: string;
  /** Dirección del front a la que vuelve el comprador al salir del checkout. */
  urlFrontend: string;
  fetch?: typeof fetch;
}

interface Preferencia {
  init_point: string;
  sandbox_init_point: string;
}

interface Pago {
  status: string;
  external_reference: string;
}

/** Checkout Pro de Mercado Pago: crea la preferencia de pago y consulta el estado real de cada pago. */
export class MercadoPagoCheckoutPro implements PasarelaPago {
  constructor(private readonly configuracion: ConfiguracionMercadoPago) {}

  async crearPago(compraId: string, total: number): Promise<{ urlPago: string }> {
    const urlRetorno = `${this.configuracion.urlFrontend}/pago/retorno?compra=${compraId}`;
    const preferencia = await this.pedir<Preferencia>('/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          {
            id: compraId,
            title: `Entradas EcoHarmony Park - Orden #${compraId}`,
            quantity: 1,
            unit_price: total,
            currency_id: 'ARS',
          },
        ],
        external_reference: compraId,
        back_urls: { success: urlRetorno, failure: urlRetorno, pending: urlRetorno },
        // Mercado Pago descarta las URLs de retorno http, y sin ellas no puede volver automáticamente al sitio.
        ...(urlRetorno.startsWith('https://') && { auto_return: 'approved' }),
      }),
    });
    const credencialDePrueba = this.configuracion.accessToken.startsWith('TEST-');
    return { urlPago: credencialDePrueba ? preferencia.sandbox_init_point : preferencia.init_point };
  }

  async consultarPago(pagoId: string): Promise<PagoExterno> {
    if (!ID_PAGO_VALIDO.test(pagoId)) throw new ErrorCompra('El pago no existe', 'NO_ENCONTRADO');
    const pago = await this.pedir<Pago>(`/v1/payments/${pagoId}`);
    return { compraId: pago.external_reference, estado: ESTADOS_FINALES[pago.status] ?? 'PENDIENTE' };
  }

  private async pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
    const hacerPedido = this.configuracion.fetch ?? fetch;
    let respuesta: Response;
    try {
      respuesta = await hacerPedido(`${API_MERCADO_PAGO}${ruta}`, {
        ...opciones,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.configuracion.accessToken}` },
      });
    } catch {
      throw errorDeConexion();
    }
    if (respuesta.status === 404) throw new ErrorCompra('El pago no existe', 'NO_ENCONTRADO');
    if (!respuesta.ok) {
      console.error(`Mercado Pago respondió ${respuesta.status}: ${await respuesta.text()}`);
      throw errorDeConexion();
    }
    return (await respuesta.json()) as T;
  }
}

function errorDeConexion() {
  return new ErrorCompra('No se pudo conectar con Mercado Pago. Intentá de nuevo en unos minutos', 'PASARELA');
}
