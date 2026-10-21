import { beforeEach, describe, expect, it } from 'vitest';
import { CompraEntradasService, type SolicitudCompra } from '../../src/dominio/compraEntradas';
import { ErrorCompra } from '../../src/dominio/errores';
import type {
  EmailSaliente,
  EstadoPagoExterno,
  PagoExterno,
  PasarelaPago,
  Reloj,
  ServicioEmail,
} from '../../src/dominio/puertos';
import type { Usuario } from '../../src/dominio/tipos';
import { RepositorioComprasEnMemoria } from '../../src/infraestructura/repositorioComprasEnMemoria';

class RelojFijo implements Reloj {
  constructor(
    public fecha = '2026-10-15',
    public hora = '10:00',
  ) {}
  ahora() {
    return { fecha: this.fecha, hora: this.hora };
  }
}

class EmailFalso implements ServicioEmail {
  enviados: EmailSaliente[] = [];
  async enviar(email: EmailSaliente) {
    this.enviados.push(email);
  }
}

class PasarelaFalsa implements PasarelaPago {
  pagos = new Map<string, PagoExterno>();
  async crearPago(compraId: string) {
    return { urlPago: `https://mercadopago.test/checkout/${compraId}` };
  }
  async consultarPago(pagoId: string) {
    const pago = this.pagos.get(pagoId);
    if (!pago) throw new ErrorCompra('El pago no existe', 'NO_ENCONTRADO');
    return pago;
  }
}

const USUARIO: Usuario = { id: 'u1', nombre: 'Ana', email: 'visitante@ejemplo.com' };
const FECHA = '2026-10-17'; // sábado

function solicitud(cambios: Partial<SolicitudCompra> = {}): SolicitudCompra {
  return {
    fechaVisita: FECHA,
    cantidad: 2,
    visitantes: [
      { edad: 30, tipoPase: 'REGULAR' },
      { edad: 10, tipoPase: 'REGULAR' },
    ],
    formaPago: 'TARJETA',
    ...cambios,
  };
}

function visitantesAdultos(cantidad: number) {
  return Array.from({ length: cantidad }, () => ({ edad: 30, tipoPase: 'REGULAR' as const }));
}

describe('CompraEntradasService', () => {
  let repositorio: RepositorioComprasEnMemoria;
  let email: EmailFalso;
  let servicio: CompraEntradasService;
  let reloj: RelojFijo;
  let pasarela: PasarelaFalsa;

  beforeEach(() => {
    repositorio = new RepositorioComprasEnMemoria();
    email = new EmailFalso();
    reloj = new RelojFijo();
    pasarela = new PasarelaFalsa();
    servicio = new CompraEntradasService(repositorio, pasarela, email, reloj);
  });

  async function comprarEnEfectivo(cantidad: number, fechaVisita = FECHA) {
    return servicio.iniciarCompra(
      USUARIO,
      solicitud({ fechaVisita, cantidad, visitantes: visitantesAdultos(cantidad), formaPago: 'EFECTIVO' }),
    );
  }

  describe('usuario y correo', () => {
    it('CP-36: un visitante registrado y logueado puede comprar', async () => {
      await expect(servicio.iniciarCompra(USUARIO, solicitud())).resolves.toBeDefined();
    });

    it('CP-37: falla si no hay una sesión iniciada', async () => {
      await expect(servicio.iniciarCompra(null, solicitud())).rejects.toThrow(
        'Debés iniciar sesión para comprar entradas',
      );
    });

    it('CP-38: falla con un correo inválido y no registra ninguna operación', async () => {
      const usuario = { ...USUARIO, email: 'visitante.ejemplo.com' };
      await expect(servicio.iniciarCompra(usuario, solicitud({ formaPago: 'EFECTIVO' }))).rejects.toThrow(
        'No se puede completar la compra porque el correo electrónico asociado es inválido',
      );
      expect(await repositorio.listar()).toHaveLength(0);
      expect(email.enviados).toHaveLength(0);
    });
  });

  it('CP-38: con tarjeta y correo inválido tampoco redirige a Mercado Pago', async () => {
    const usuario = { ...USUARIO, email: 'visitante.ejemplo.com' };
    await expect(servicio.iniciarCompra(usuario, solicitud({ formaPago: 'TARJETA' }))).rejects.toThrow(/correo/);
    expect(await repositorio.listar()).toHaveLength(0);
  });

  describe('límite de 10 entradas por usuario y fecha', () => {
    it('criterio 10: el parque no tiene cupo máximo diario (otros usuarios no afectan el límite)', async () => {
      for (let i = 1; i <= 5; i++) {
        const otro = { ...USUARIO, id: `otro-${i}` };
        await servicio.iniciarCompra(
          otro,
          solicitud({ cantidad: 10, visitantes: visitantesAdultos(10), formaPago: 'EFECTIVO' }),
        );
      }
      await expect(comprarEnEfectivo(10)).resolves.toBeDefined();
    });

    it('CP-06: permite 10 entradas para una fecha sin compras anteriores', async () => {
      await expect(comprarEnEfectivo(10)).resolves.toBeDefined();
    });

    it('CP-08: con 7 entradas previas permite comprar 3 más', async () => {
      await comprarEnEfectivo(7);
      await expect(comprarEnEfectivo(3)).resolves.toBeDefined();
    });

    it('CP-09: con 7 entradas previas no permite comprar 4 más', async () => {
      await comprarEnEfectivo(7);
      await expect(comprarEnEfectivo(4)).rejects.toThrow(
        'No podés superar las 10 entradas para la misma fecha. Ya tenés 7 entradas para ese día',
      );
    });

    it('CP-10: las entradas de otra fecha no cuentan para el límite', async () => {
      await comprarEnEfectivo(10, '2026-10-17');
      await expect(comprarEnEfectivo(1, '2026-10-18')).resolves.toBeDefined();
    });

    it('las compras con tarjeta rechazadas no cuentan para el límite', async () => {
      const { compra } = await servicio.iniciarCompra(
        USUARIO,
        solicitud({ cantidad: 10, visitantes: visitantesAdultos(10) }),
      );
      await servicio.registrarResultadoPago(compra.id, false);
      await expect(comprarEnEfectivo(10)).resolves.toBeDefined();
    });

    it('usa el singular al informar que ya tiene 1 entrada', async () => {
      await comprarEnEfectivo(1);
      await expect(comprarEnEfectivo(10)).rejects.toThrow('Ya tenés 1 entrada para ese día');
    });

    it('vuelve a controlar el límite al aprobarse un pago con tarjeta', async () => {
      const { compra } = await servicio.iniciarCompra(
        USUARIO,
        solicitud({ cantidad: 5, visitantes: visitantesAdultos(5) }),
      );
      await comprarEnEfectivo(10);
      const resultado = await servicio.registrarResultadoPago(compra.id, true);
      expect(resultado.compra.estado).toBe('RECHAZADA');
    });
  });

  describe('validaciones de la solicitud', () => {
    it('valida la fecha de visita (CP-19, lunes)', async () => {
      await expect(servicio.iniciarCompra(USUARIO, solicitud({ fechaVisita: '2026-10-19' }))).rejects.toThrow(
        /cerrado/,
      );
    });

    it('valida la cantidad (CP-07)', async () => {
      await expect(
        servicio.iniciarCompra(USUARIO, solicitud({ cantidad: 11, visitantes: visitantesAdultos(11) })),
      ).rejects.toThrow(/más de 10 entradas/);
    });

    it('valida las edades (CP-23)', async () => {
      await expect(servicio.iniciarCompra(USUARIO, solicitud({ cantidad: 3 }))).rejects.toThrow(
        /edad de cada visitante/,
      );
    });

    it('falla con un mensaje claro si la solicitud viene vacía', async () => {
      await expect(servicio.iniciarCompra(USUARIO, undefined as never)).rejects.toThrow(
        'La fecha de visita es obligatoria',
      );
      expect(() => servicio.cotizar(undefined as never)).toThrow('La fecha de visita es obligatoria');
    });

    it('CP-39: falla si no se selecciona una forma de pago', async () => {
      await expect(servicio.iniciarCompra(USUARIO, solicitud({ formaPago: undefined }))).rejects.toThrow(
        'Se debe seleccionar una forma de pago: tarjeta o efectivo',
      );
    });
  });

  describe('cotización', () => {
    it('informa el detalle de precios y el total sin registrar la compra', async () => {
      const cotizacion = servicio.cotizar(solicitud());
      expect(cotizacion.total).toBe(15000);
      expect(cotizacion.entradas.map((e) => e.precio)).toEqual([10000, 5000]);
      expect(await repositorio.listar()).toHaveLength(0);
    });
  });

  describe('pago con tarjeta mediante Mercado Pago', () => {
    it('CP-40: redirige a Mercado Pago y deja la compra pendiente', async () => {
      const resultado = await servicio.iniciarCompra(USUARIO, solicitud());
      expect(resultado.urlPago).toBe(`https://mercadopago.test/checkout/${resultado.compra.id}`);
      expect(resultado.compra.estado).toBe('PENDIENTE_MERCADO_PAGO');
      expect(email.enviados).toHaveLength(0);
    });

    it('CP-41: con el pago aprobado confirma la compra y genera las entradas', async () => {
      const { compra } = await servicio.iniciarCompra(USUARIO, solicitud());
      const resultado = await servicio.registrarResultadoPago(compra.id, true);
      expect(resultado.compra.estado).toBe('CONFIRMADA');
      expect(resultado.compra.entradas).toHaveLength(2);
      expect(new Set(resultado.compra.entradas.map((e) => e.codigo)).size).toBe(2);
    });

    it('CP-42 / CP-47: con el pago rechazado no confirma, no genera entradas ni envía correo', async () => {
      const { compra } = await servicio.iniciarCompra(USUARIO, solicitud());
      const resultado = await servicio.registrarResultadoPago(compra.id, false);
      expect(resultado.compra.estado).toBe('RECHAZADA');
      expect(resultado.compra.entradas).toHaveLength(0);
      expect(resultado.mensaje).toBe('El pago no pudo realizarse. La compra no fue confirmada');
      expect(email.enviados).toHaveLength(0);
    });

    it('CP-46: envía el correo de confirmación luego de un pago aprobado', async () => {
      const { compra } = await servicio.iniciarCompra(USUARIO, solicitud());
      await servicio.registrarResultadoPago(compra.id, true);
      expect(email.enviados).toHaveLength(1);
      expect(email.enviados[0].destinatario).toBe('visitante@ejemplo.com');
      expect(email.enviados[0].asunto).toBe('Confirmación de compra - EcoHarmony Park');
    });

    it('rechaza un pago aprobado si la fecha de visita ya pasó', async () => {
      const { compra } = await servicio.iniciarCompra(USUARIO, solicitud());
      reloj.fecha = '2026-10-18';
      const resultado = await servicio.registrarResultadoPago(compra.id, true);
      expect(resultado.compra.estado).toBe('RECHAZADA');
      expect(resultado.mensaje).toBe('La fecha de visita no puede ser anterior a hoy');
      expect(email.enviados).toHaveLength(0);
    });

    it('el mail detalla cada visitante usando el singular para 1 año', async () => {
      await servicio.iniciarCompra(
        USUARIO,
        solicitud({ cantidad: 1, visitantes: [{ edad: 1, tipoPase: 'VIP' }], formaPago: 'EFECTIVO' }),
      );
      expect(email.enviados[0].cuerpo).toContain('- EHP-000001-1 | Pase VIP | 1 año | $0');
    });

    it('no permite registrar dos veces el resultado de un mismo pago', async () => {
      const { compra } = await servicio.iniciarCompra(USUARIO, solicitud());
      await servicio.registrarResultadoPago(compra.id, true);
      await expect(servicio.registrarResultadoPago(compra.id, true)).rejects.toThrow(
        'La compra no está esperando un pago de Mercado Pago',
      );
    });

    it('falla si la compra no existe', async () => {
      await expect(servicio.registrarResultadoPago('no-existe', true)).rejects.toThrow('La compra no existe');
    });

    it('con un total de $0 confirma la compra sin pasar por Mercado Pago', async () => {
      const resultado = await servicio.iniciarCompra(
        USUARIO,
        solicitud({ cantidad: 1, visitantes: [{ edad: 2, tipoPase: 'REGULAR' }] }),
      );
      expect(resultado.urlPago).toBeUndefined();
      expect(resultado.compra.estado).toBe('CONFIRMADA');
      expect(resultado.mensaje).toBe('Compraste 1 entrada para el 17/10/2026');
      expect(email.enviados).toHaveLength(1);
    });
  });

  describe('confirmación del pago consultando a Mercado Pago', () => {
    async function pagarConTarjeta(estado: EstadoPagoExterno, pagoId = '123') {
      const { compra } = await servicio.iniciarCompra(USUARIO, solicitud());
      pasarela.pagos.set(pagoId, { compraId: compra.id, estado });
      return compra;
    }

    it('CP-41: confirma la compra si Mercado Pago informa el pago aprobado', async () => {
      await pagarConTarjeta('APROBADO');
      const resultado = await servicio.confirmarPagoMercadoPago(USUARIO, '123');
      expect(resultado.compra.estado).toBe('CONFIRMADA');
      expect(resultado.mensaje).toBe('Compraste 2 entradas para el 17/10/2026');
      expect(email.enviados).toHaveLength(1);
    });

    it('CP-42: rechaza la compra si Mercado Pago informa el pago rechazado', async () => {
      await pagarConTarjeta('RECHAZADO');
      const resultado = await servicio.confirmarPagoMercadoPago(USUARIO, '123');
      expect(resultado.compra.estado).toBe('RECHAZADA');
      expect(resultado.mensaje).toBe('El pago no pudo realizarse. La compra no fue confirmada');
      expect(email.enviados).toHaveLength(0);
    });

    it('deja la compra pendiente mientras Mercado Pago procesa el pago', async () => {
      await pagarConTarjeta('PENDIENTE');
      const resultado = await servicio.confirmarPagoMercadoPago(USUARIO, '123');
      expect(resultado.compra.estado).toBe('PENDIENTE_MERCADO_PAGO');
      expect(resultado.mensaje).toBe('Mercado Pago todavía no acreditó el pago de esta compra');
      expect(email.enviados).toHaveLength(0);
    });

    it('confirmar dos veces el mismo pago no duplica las entradas ni el correo', async () => {
      await pagarConTarjeta('APROBADO');
      await servicio.confirmarPagoMercadoPago(USUARIO, '123');
      const resultado = await servicio.confirmarPagoMercadoPago(USUARIO, '123');
      expect(resultado.compra.estado).toBe('CONFIRMADA');
      expect(resultado.compra.entradas).toHaveLength(2);
      expect(email.enviados).toHaveLength(1);
    });

    it('falla si el pago no existe en Mercado Pago', async () => {
      await expect(servicio.confirmarPagoMercadoPago(USUARIO, '999')).rejects.toThrow('El pago no existe');
    });

    it('CP-37: falla si no hay una sesión iniciada', async () => {
      await pagarConTarjeta('APROBADO');
      await expect(servicio.confirmarPagoMercadoPago(null, '123')).rejects.toThrow(
        'Debés iniciar sesión para consultar tus compras',
      );
    });

    it('no permite confirmar la compra de otro usuario', async () => {
      const compra = await pagarConTarjeta('APROBADO');
      await expect(servicio.confirmarPagoMercadoPago({ ...USUARIO, id: 'otro' }, '123')).rejects.toThrow(
        'La compra no existe',
      );
      expect((await repositorio.buscarPorId(compra.id))?.estado).toBe('PENDIENTE_MERCADO_PAGO');
    });
  });

  describe('consulta de una compra', () => {
    it('informa el estado y el mensaje de una compra confirmada', async () => {
      const { compra } = await servicio.iniciarCompra(USUARIO, solicitud());
      await servicio.registrarResultadoPago(compra.id, true);
      const resultado = await servicio.obtenerCompra(USUARIO, compra.id);
      expect(resultado.compra.estado).toBe('CONFIRMADA');
      expect(resultado.mensaje).toBe('Compraste 2 entradas para el 17/10/2026');
    });

    it('informa que el pago no fue acreditado si se volvió de Mercado Pago sin pagar', async () => {
      const { compra } = await servicio.iniciarCompra(USUARIO, solicitud());
      const resultado = await servicio.obtenerCompra(USUARIO, compra.id);
      expect(resultado.compra.estado).toBe('PENDIENTE_MERCADO_PAGO');
      expect(resultado.mensaje).toBe('Mercado Pago todavía no acreditó el pago de esta compra');
    });

    it('no muestra compras de otro usuario', async () => {
      const { compra } = await servicio.iniciarCompra(USUARIO, solicitud());
      await expect(servicio.obtenerCompra({ ...USUARIO, id: 'otro' }, compra.id)).rejects.toThrow(
        'La compra no existe',
      );
    });
  });

  describe('pago en efectivo', () => {
    it('CP-43 / CP-44: registra la operación pendiente de pago en boletería sin redirigir', async () => {
      const resultado = await servicio.iniciarCompra(USUARIO, solicitud({ formaPago: 'EFECTIVO' }));
      expect(resultado.compra.estado).toBe('PENDIENTE_PAGO_BOLETERIA');
      expect(resultado.compra.abonada).toBe(false);
      expect(resultado.urlPago).toBeUndefined();
    });

    it('CP-45: envía un correo indicando que el pago está pendiente', async () => {
      await servicio.iniciarCompra(USUARIO, solicitud({ formaPago: 'EFECTIVO' }));
      expect(email.enviados).toHaveLength(1);
      expect(email.enviados[0].asunto).toBe('Entradas registradas - Pago pendiente en boletería');
      expect(email.enviados[0].cuerpo).toContain('pago se encuentra pendiente en boletería');
    });
  });

  describe('resultado final', () => {
    it('CP-48: informa la cantidad de entradas y la fecha de visita', async () => {
      const resultado = await servicio.iniciarCompra(USUARIO, solicitud({ formaPago: 'EFECTIVO' }));
      expect(resultado.mensaje).toBe(
        'Registraste 2 entradas para el 17/10/2026. El pago se encuentra pendiente en boletería',
      );
    });

    it('usa el singular cuando se compra una sola entrada', async () => {
      const resultado = await comprarEnEfectivo(1);
      expect(resultado.mensaje).toMatch(/^Registraste 1 entrada para el 17\/10\/2026/);
    });

    it('CP-49: flujo completo con tarjeta', async () => {
      const inicio = await servicio.iniciarCompra(USUARIO, solicitud());
      expect(inicio.compra.total).toBe(15000);
      expect(inicio.urlPago).toBeDefined();

      const final = await servicio.registrarResultadoPago(inicio.compra.id, true);
      expect(final.compra.estado).toBe('CONFIRMADA');
      expect(final.compra.abonada).toBe(true);
      expect(final.compra.entradas).toHaveLength(2);
      expect(final.mensaje).toBe('Compraste 2 entradas para el 17/10/2026');
      expect(email.enviados).toHaveLength(1);
      expect(email.enviados[0].cuerpo).toContain('Total: $15.000');
    });

    it('CP-50: flujo completo con efectivo', async () => {
      const resultado = await servicio.iniciarCompra(USUARIO, solicitud({ formaPago: 'EFECTIVO' }));
      expect(resultado.compra.total).toBe(15000);
      expect(resultado.compra.estado).toBe('PENDIENTE_PAGO_BOLETERIA');
      expect(resultado.urlPago).toBeUndefined();
      expect(resultado.mensaje).toContain('2 entradas para el 17/10/2026');
      expect(resultado.mensaje).toContain('pendiente en boletería');
      expect(email.enviados).toHaveLength(1);
    });
  });
});
