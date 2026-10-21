import type { EntradaCotizada } from './precios';
import type { FormaPago } from './tipos';

export type EstadoCompra = 'PENDIENTE_MERCADO_PAGO' | 'CONFIRMADA' | 'RECHAZADA' | 'PENDIENTE_PAGO_BOLETERIA';

export interface Entrada extends EntradaCotizada {
  codigo: string;
}

export interface Compra {
  id: string;
  usuarioId: string;
  email: string;
  fechaVisita: string;
  cantidad: number;
  detalle: EntradaCotizada[];
  total: number;
  formaPago: FormaPago;
  estado: EstadoCompra;
  abonada: boolean;
  entradas: Entrada[];
}
