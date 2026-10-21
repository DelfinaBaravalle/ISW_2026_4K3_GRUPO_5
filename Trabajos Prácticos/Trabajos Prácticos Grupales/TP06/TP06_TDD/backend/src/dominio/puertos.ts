import type { Compra, EstadoCompra } from './compra';
import type { Instante } from './reglasFecha';

/** Dependencias externas del caso de uso. Se reemplazan por dobles en los tests. */

export interface RepositorioCompras {
  guardar(compra: Omit<Compra, 'id'>): Promise<Compra>;
  actualizar(compra: Compra): Promise<void>;
  buscarPorId(id: string): Promise<Compra | undefined>;
  listar(): Promise<Compra[]>;
}

export type EstadoPagoExterno = 'APROBADO' | 'RECHAZADO' | 'PENDIENTE';

export interface PagoExterno {
  compraId: string;
  estado: EstadoPagoExterno;
}

export interface PasarelaPago {
  crearPago(compraId: string, total: number): Promise<{ urlPago: string }>;
  /** Estado real de un pago según la pasarela (no se confía en lo que informa el navegador al volver). */
  consultarPago(pagoId: string): Promise<PagoExterno>;
}

export interface EmailSaliente {
  destinatario: string;
  asunto: string;
  cuerpo: string;
}

export interface ServicioEmail {
  enviar(email: EmailSaliente): Promise<void>;
}

export interface Reloj {
  ahora(): Instante;
}

export const ESTADOS_QUE_OCUPAN_CUPO: readonly EstadoCompra[] = ['CONFIRMADA', 'PENDIENTE_PAGO_BOLETERIA'];
