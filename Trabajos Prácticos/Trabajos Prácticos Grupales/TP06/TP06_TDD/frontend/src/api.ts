export type TipoPase = 'REGULAR' | 'VIP';
export type FormaPago = 'TARJETA' | 'EFECTIVO';
export type EstadoCompra = 'PENDIENTE_MERCADO_PAGO' | 'CONFIRMADA' | 'RECHAZADA' | 'PENDIENTE_PAGO_BOLETERIA';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
}

export interface DiaCalendario {
  fecha: string;
  abierto: boolean;
  disponible: boolean;
}

export interface Calendario {
  hoy: string;
  fechaMaxima: string;
  horaLimiteMismoDia: string;
  fechas: DiaCalendario[];
}

export interface VisitanteForm {
  edad: number | '';
  tipoPase: TipoPase | '';
}

export interface SolicitudCompra {
  fechaVisita: string;
  cantidad: number;
  visitantes: VisitanteForm[];
  formaPago?: FormaPago;
}

export interface EntradaCotizada {
  edad: number;
  tipoPase: TipoPase;
  precioBase: number;
  porcentajeDescuento: number;
  precio: number;
  codigo?: string;
}

export interface Cotizacion {
  entradas: EntradaCotizada[];
  total: number;
}

export interface Compra {
  id: string;
  email: string;
  fechaVisita: string;
  cantidad: number;
  detalle: EntradaCotizada[];
  total: number;
  formaPago: FormaPago;
  estado: EstadoCompra;
  abonada: boolean;
  entradas: EntradaCotizada[];
}

export interface ResultadoCompra {
  compra: Compra;
  mensaje: string;
  urlPago?: string;
}

export interface Precios {
  preciosBase: Record<TipoPase, number>;
  maximoEntradasPorFecha: number;
}

export interface EmailEnviado {
  destinatario: string;
  asunto: string;
  cuerpo: string;
  enviadoEn: string;
}

/** El login está fuera del alcance de la US: se usa una sesión simulada. */
const TOKEN_SESION = 'sesion-demo';

async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(`/api${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN_SESION}`,
      ...opciones.headers,
    },
  });
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(cuerpo.error ?? 'No se pudo conectar con el servidor');
  return cuerpo as T;
}

export const api = {
  sesion: () => pedir<Usuario>('/sesion'),
  calendario: () => pedir<Calendario>('/calendario'),
  precios: () => pedir<Precios>('/precios'),
  cotizar: (s: SolicitudCompra) =>
    pedir<Cotizacion>('/compras/cotizacion', { method: 'POST', body: JSON.stringify(s) }),
  comprar: (s: SolicitudCompra) => pedir<ResultadoCompra>('/compras', { method: 'POST', body: JSON.stringify(s) }),
  compra: (id: string) => pedir<ResultadoCompra>(`/compras/${encodeURIComponent(id)}`),
  confirmarPagoMercadoPago: (pagoId: string) =>
    pedir<ResultadoCompra>(`/mercado-pago/pagos/${encodeURIComponent(pagoId)}/confirmacion`, { method: 'POST' }),
  compraMercadoPago: (id: string) =>
    pedir<{ id: string; total: number; cantidad: number; estado: EstadoCompra }>(`/mercado-pago/${id}`),
  resultadoMercadoPago: (id: string, aprobado: boolean) =>
    pedir<ResultadoCompra>(`/mercado-pago/${id}/resultado`, { method: 'POST', body: JSON.stringify({ aprobado }) }),
  emails: () => pedir<EmailEnviado[]>('/emails'),
};
