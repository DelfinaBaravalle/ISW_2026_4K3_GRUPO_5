import { ErrorCompra } from '../dominio/errores';
import type { PagoExterno, PasarelaPago } from '../dominio/puertos';

/** Simula la creación de un checkout de Mercado Pago: redirige a una pantalla propia del front. */
export class MercadoPagoSimulado implements PasarelaPago {
  async crearPago(compraId: string): Promise<{ urlPago: string }> {
    return { urlPago: `/mercado-pago/${compraId}` };
  }

  /** La pantalla simulada informa el resultado directamente: no existen pagos para consultar. */
  async consultarPago(): Promise<PagoExterno> {
    throw new ErrorCompra('El pago no existe', 'NO_ENCONTRADO');
  }
}
