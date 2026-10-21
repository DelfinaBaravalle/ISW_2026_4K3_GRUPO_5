import type { Compra } from './compra';
import { ErrorCompra } from './errores';
import { formatearFecha, formatearPesos, pluralizar } from './formato';
import { calcularDetallePrecios, type DetallePrecios } from './precios';
import {
  ESTADOS_QUE_OCUPAN_CUPO,
  type PasarelaPago,
  type Reloj,
  type RepositorioCompras,
  type ServicioEmail,
} from './puertos';
import { MAXIMO_ENTRADAS_POR_FECHA, validarCantidad, validarVisitantes } from './reglasEntradas';
import { validarFechaVisita } from './reglasFecha';
import { FORMAS_PAGO, type FormaPago, type Usuario, type Visitante, type VisitanteSinValidar } from './tipos';

export interface SolicitudCompra {
  fechaVisita?: string;
  cantidad?: unknown;
  visitantes?: VisitanteSinValidar[];
  formaPago?: unknown;
}

export interface ResultadoCompra {
  compra: Compra;
  mensaje: string;
  urlPago?: string;
}

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MENSAJE_PAGO_RECHAZADO = 'El pago no pudo realizarse. La compra no fue confirmada';
const MENSAJE_PAGO_SIN_ACREDITAR = 'Mercado Pago todavía no acreditó el pago de esta compra';

export class CompraEntradasService {
  constructor(
    private readonly repositorio: RepositorioCompras,
    private readonly pasarela: PasarelaPago,
    private readonly email: ServicioEmail,
    private readonly reloj: Reloj,
  ) {}

  cotizar(solicitud: SolicitudCompra): DetallePrecios {
    return calcularDetallePrecios(this.validarDatosDeEntradas(solicitud).visitantes);
  }

  async iniciarCompra(usuario: Usuario | null, solicitud: SolicitudCompra): Promise<ResultadoCompra> {
    if (!usuario) throw new ErrorCompra('Debés iniciar sesión para comprar entradas', 'NO_AUTENTICADO');
    const { fechaVisita, cantidad, visitantes } = this.validarDatosDeEntradas(solicitud);
    const formaPago = solicitud.formaPago;
    if (!FORMAS_PAGO.includes(formaPago as FormaPago)) {
      throw new ErrorCompra('Se debe seleccionar una forma de pago: tarjeta o efectivo');
    }
    if (!FORMATO_EMAIL.test(usuario.email)) {
      throw new ErrorCompra('No se puede completar la compra porque el correo electrónico asociado es inválido');
    }
    await this.validarLimiteDeEntradas(usuario.id, fechaVisita, cantidad);

    const { entradas: detalle, total } = calcularDetallePrecios(visitantes);
    const esEfectivo = formaPago === 'EFECTIVO';
    const compra = await this.repositorio.guardar({
      usuarioId: usuario.id,
      email: usuario.email,
      fechaVisita,
      cantidad,
      detalle,
      total,
      formaPago: formaPago as FormaPago,
      estado: esEfectivo ? 'PENDIENTE_PAGO_BOLETERIA' : 'PENDIENTE_MERCADO_PAGO',
      abonada: false,
      entradas: [],
    });

    if (esEfectivo) {
      compra.entradas = generarEntradas(compra);
      await this.repositorio.actualizar(compra);
      await this.email.enviar({
        destinatario: compra.email,
        asunto: 'Entradas registradas - Pago pendiente en boletería',
        cuerpo: cuerpoEmail(compra, 'Tus entradas fueron registradas. El pago se encuentra pendiente en boletería.'),
      });
      return { compra, mensaje: `${resumen(compra, 'Registraste')}. El pago se encuentra pendiente en boletería` };
    }

    // Mercado Pago no acepta cobros de $0 (por ejemplo, solo menores de 4 años): no hay nada que pagar.
    if (compra.total === 0) return this.confirmar(compra);

    const { urlPago } = await this.pasarela.crearPago(compra.id, compra.total);
    return { compra, mensaje: 'Redirigiendo a Mercado Pago para completar el pago', urlPago };
  }

  async obtenerCompra(usuario: Usuario | null, compraId: string): Promise<ResultadoCompra> {
    const compra = await this.buscarCompraDe(usuario, compraId);
    return { compra, mensaje: mensajeSegunEstado(compra) };
  }

  /** Al volver del checkout se consulta el pago a Mercado Pago: el navegador no es una fuente confiable. */
  async confirmarPagoMercadoPago(usuario: Usuario | null, pagoId: string): Promise<ResultadoCompra> {
    const pago = await this.pasarela.consultarPago(pagoId);
    const compra = await this.buscarCompraDe(usuario, pago.compraId);
    // Si el pago sigue en proceso o ya se registró (por ejemplo, al recargar la página), se informa el estado actual.
    if (pago.estado === 'PENDIENTE' || compra.estado !== 'PENDIENTE_MERCADO_PAGO') {
      return { compra, mensaje: mensajeSegunEstado(compra) };
    }
    return this.registrarResultadoPago(compra.id, pago.estado === 'APROBADO');
  }

  async registrarResultadoPago(compraId: string, aprobado: boolean): Promise<ResultadoCompra> {
    const compra = await this.repositorio.buscarPorId(compraId);
    if (!compra) throw new ErrorCompra('La compra no existe', 'NO_ENCONTRADO');
    if (compra.estado !== 'PENDIENTE_MERCADO_PAGO') {
      throw new ErrorCompra('La compra no está esperando un pago de Mercado Pago');
    }

    if (aprobado) {
      if (compra.fechaVisita < this.reloj.ahora().fecha) {
        return this.rechazar(compra, 'La fecha de visita no puede ser anterior a hoy');
      }
      try {
        await this.validarLimiteDeEntradas(compra.usuarioId, compra.fechaVisita, compra.cantidad);
      } catch (error) {
        return this.rechazar(compra, (error as Error).message);
      }
      return this.confirmar(compra);
    }

    return this.rechazar(compra, MENSAJE_PAGO_RECHAZADO);
  }

  private async confirmar(compra: Compra): Promise<ResultadoCompra> {
    compra.estado = 'CONFIRMADA';
    compra.abonada = true;
    compra.entradas = generarEntradas(compra);
    await this.repositorio.actualizar(compra);
    await this.email.enviar({
      destinatario: compra.email,
      asunto: 'Confirmación de compra - EcoHarmony Park',
      cuerpo: cuerpoEmail(compra, '¡Tu compra fue confirmada! Presentá estos códigos al ingresar al parque.'),
    });
    return { compra, mensaje: mensajeSegunEstado(compra) };
  }

  private async buscarCompraDe(usuario: Usuario | null, compraId: string): Promise<Compra> {
    if (!usuario) throw new ErrorCompra('Debés iniciar sesión para consultar tus compras', 'NO_AUTENTICADO');
    const compra = await this.repositorio.buscarPorId(compraId);
    if (!compra || compra.usuarioId !== usuario.id) throw new ErrorCompra('La compra no existe', 'NO_ENCONTRADO');
    return compra;
  }

  private async rechazar(compra: Compra, mensaje: string): Promise<ResultadoCompra> {
    compra.estado = 'RECHAZADA';
    await this.repositorio.actualizar(compra);
    return { compra, mensaje };
  }

  private validarDatosDeEntradas(solicitud: SolicitudCompra | undefined) {
    const { fechaVisita, cantidad, visitantes } = solicitud ?? {};
    validarFechaVisita(fechaVisita, this.reloj.ahora());
    validarCantidad(cantidad);
    validarVisitantes(visitantes, cantidad);
    return { fechaVisita: fechaVisita as string, cantidad, visitantes: visitantes as Visitante[] };
  }

  private async validarLimiteDeEntradas(usuarioId: string, fechaVisita: string, cantidad: number) {
    const compras = await this.repositorio.listar();
    const yaCompradas = compras
      .filter((c) => c.usuarioId === usuarioId && c.fechaVisita === fechaVisita)
      .filter((c) => ESTADOS_QUE_OCUPAN_CUPO.includes(c.estado))
      .reduce((suma, c) => suma + c.cantidad, 0);
    if (yaCompradas + cantidad > MAXIMO_ENTRADAS_POR_FECHA) {
      throw new ErrorCompra(
        `No podés superar las ${MAXIMO_ENTRADAS_POR_FECHA} entradas para la misma fecha. ` +
          `Ya tenés ${pluralizar(yaCompradas, 'entrada')} para ese día`,
      );
    }
  }
}

function generarEntradas(compra: Compra) {
  return compra.detalle.map((entrada, i) => ({ ...entrada, codigo: `EHP-${compra.id}-${i + 1}` }));
}

function resumen(compra: Compra, verbo: string): string {
  return `${verbo} ${pluralizar(compra.cantidad, 'entrada')} para el ${formatearFecha(compra.fechaVisita)}`;
}

function mensajeSegunEstado(compra: Compra): string {
  switch (compra.estado) {
    case 'CONFIRMADA':
      return resumen(compra, 'Compraste');
    case 'PENDIENTE_PAGO_BOLETERIA':
      return `${resumen(compra, 'Registraste')}. El pago se encuentra pendiente en boletería`;
    case 'RECHAZADA':
      return MENSAJE_PAGO_RECHAZADO;
    case 'PENDIENTE_MERCADO_PAGO':
      return MENSAJE_PAGO_SIN_ACREDITAR;
  }
}

function cuerpoEmail(compra: Compra, encabezado: string): string {
  const lineas = compra.entradas.map(
    (e) =>
      `- ${e.codigo} | Pase ${e.tipoPase === 'VIP' ? 'VIP' : 'Regular'} | ${pluralizar(e.edad, 'año')} | ${formatearPesos(e.precio)}`,
  );
  return [
    encabezado,
    '',
    `Orden: ${compra.id}`,
    `Fecha de visita: ${formatearFecha(compra.fechaVisita)}`,
    `Cantidad de entradas: ${compra.cantidad}`,
    ...lineas,
    `Total: ${formatearPesos(compra.total)}`,
  ].join('\n');
}
