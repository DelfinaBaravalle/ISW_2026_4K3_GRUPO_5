export const TIPOS_PASE = ['REGULAR', 'VIP'] as const;
export type TipoPase = (typeof TIPOS_PASE)[number];

export interface Visitante {
  edad: number;
  tipoPase: TipoPase;
}

/** Visitante tal como llega desde afuera, todavía sin validar. */
export interface VisitanteSinValidar {
  edad?: unknown;
  tipoPase?: unknown;
}

export const FORMAS_PAGO = ['TARJETA', 'EFECTIVO'] as const;
export type FormaPago = (typeof FORMAS_PAGO)[number];

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
}
