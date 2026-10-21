import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearApp } from '../../src/api/app';
import { ErrorCompra } from '../../src/dominio/errores';
import type { EstadoPagoExterno, PasarelaPago, Reloj } from '../../src/dominio/puertos';
import { EmailSimulado } from '../../src/infraestructura/emailSimulado';
import { RepositorioComprasEnMemoria } from '../../src/infraestructura/repositorioComprasEnMemoria';

const relojFijo: Reloj = { ahora: () => ({ fecha: '2026-10-15', hora: '10:00' }) };
const SESION = { Authorization: 'Bearer sesion-demo' };
const SESION_MAIL_INVALIDO = { Authorization: 'Bearer sesion-mail-invalido' };

const compraValida = {
  fechaVisita: '2026-10-17',
  cantidad: 2,
  visitantes: [
    { edad: 30, tipoPase: 'REGULAR' },
    { edad: 10, tipoPase: 'REGULAR' },
  ],
  formaPago: 'TARJETA',
};

/** Mercado Pago con un único pago (id 123) asociado a la primera compra registrada. */
function mercadoPagoConPago(estado: EstadoPagoExterno): PasarelaPago {
  return {
    crearPago: async (compraId) => ({ urlPago: `https://mercadopago.test/checkout/${compraId}` }),
    consultarPago: async (pagoId) => {
      if (pagoId !== '123') throw new ErrorCompra('El pago no existe', 'NO_ENCONTRADO');
      return { compraId: '000001', estado };
    },
  };
}

describe('API de compra de entradas', () => {
  let app: ReturnType<typeof crearApp>;
  let email: EmailSimulado;

  beforeEach(() => {
    email = new EmailSimulado();
    app = crearApp({ reloj: relojFijo, email });
  });

  it('GET /api/sesion devuelve el usuario logueado', async () => {
    const res = await request(app).get('/api/sesion').set(SESION);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('visitante@ejemplo.com');
  });

  it('GET /api/sesion responde 401 sin sesión', async () => {
    const res = await request(app).get('/api/sesion');
    expect(res.status).toBe(401);
  });

  it('GET /api/calendario informa las fechas del próximo mes y marca las cerradas', async () => {
    const res = await request(app).get('/api/calendario');
    expect(res.status).toBe(200);
    expect(res.body.hoy).toBe('2026-10-15');
    expect(res.body.fechaMaxima).toBe('2026-11-15');
    const lunes = res.body.fechas.find((f: { fecha: string }) => f.fecha === '2026-10-19');
    const sabado = res.body.fechas.find((f: { fecha: string }) => f.fecha === '2026-10-17');
    expect(lunes.disponible).toBe(false);
    expect(sabado.disponible).toBe(true);
    expect(res.body.fechas).toHaveLength(32);
  });

  it('GET /api/calendario deshabilita hoy después de las 17:30', async () => {
    const tarde = crearApp({ reloj: { ahora: () => ({ fecha: '2026-10-15', hora: '18:00' }) } });
    const res = await request(tarde).get('/api/calendario');
    expect(res.body.fechas[0]).toMatchObject({ fecha: '2026-10-15', disponible: false });
  });

  it('GET /api/precios informa los precios base', async () => {
    const res = await request(app).get('/api/precios');
    expect(res.body.preciosBase).toEqual({ REGULAR: 10000, VIP: 20000 });
  });

  it('POST /api/compras/cotizacion calcula el total', async () => {
    const res = await request(app).post('/api/compras/cotizacion').set(SESION).send(compraValida);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(15000);
  });

  it('POST /api/compras/cotizacion responde 400 con datos inválidos', async () => {
    const res = await request(app)
      .post('/api/compras/cotizacion')
      .set(SESION)
      .send({ ...compraValida, cantidad: 11 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/más de 10 entradas/);
  });

  it('POST /api/compras responde 401 sin sesión (CP-37)', async () => {
    const res = await request(app).post('/api/compras').send(compraValida);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Debés iniciar sesión para comprar entradas');
  });

  it('POST /api/compras responde 400 si el correo del usuario es inválido (CP-38)', async () => {
    const res = await request(app).post('/api/compras').set(SESION_MAIL_INVALIDO).send(compraValida);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/correo electrónico asociado es inválido/);
  });

  it('POST /api/compras con tarjeta devuelve la URL de Mercado Pago (CP-40)', async () => {
    const res = await request(app).post('/api/compras').set(SESION).send(compraValida);
    expect(res.status).toBe(201);
    expect(res.body.compra.estado).toBe('PENDIENTE_MERCADO_PAGO');
    expect(res.body.urlPago).toBe(`/mercado-pago/${res.body.compra.id}`);
  });

  it('flujo completo con tarjeta: Mercado Pago aprueba y llega el mail (CP-49)', async () => {
    const inicio = await request(app).post('/api/compras').set(SESION).send(compraValida);
    const pago = await request(app)
      .post(`/api/mercado-pago/${inicio.body.compra.id}/resultado`)
      .send({ aprobado: true });
    expect(pago.status).toBe(200);
    expect(pago.body.compra.estado).toBe('CONFIRMADA');
    expect(pago.body.mensaje).toBe('Compraste 2 entradas para el 17/10/2026');

    const mails = await request(app).get('/api/emails').set(SESION);
    expect(mails.body).toHaveLength(1);
    expect(mails.body[0].asunto).toBe('Confirmación de compra - EcoHarmony Park');
  });

  it('Mercado Pago rechaza el pago (CP-42)', async () => {
    const inicio = await request(app).post('/api/compras').set(SESION).send(compraValida);
    const pago = await request(app)
      .post(`/api/mercado-pago/${inicio.body.compra.id}/resultado`)
      .send({ aprobado: false });
    expect(pago.status).toBe(200);
    expect(pago.body.compra.estado).toBe('RECHAZADA');
  });

  it('GET /api/mercado-pago/:id muestra el total a pagar', async () => {
    const inicio = await request(app).post('/api/compras').set(SESION).send(compraValida);
    const res = await request(app).get(`/api/mercado-pago/${inicio.body.compra.id}`);
    expect(res.body).toMatchObject({ id: inicio.body.compra.id, total: 15000, estado: 'PENDIENTE_MERCADO_PAGO' });
  });

  it('GET /api/mercado-pago/:id responde 404 si la compra no existe', async () => {
    const res = await request(app).get('/api/mercado-pago/999');
    expect(res.status).toBe(404);
  });

  it('POST /api/compras sin cuerpo responde 400 con un mensaje claro', async () => {
    const res = await request(app).post('/api/compras').set(SESION);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('La fecha de visita es obligatoria');
  });

  it('POST /api/compras con un JSON mal formado responde 400', async () => {
    const res = await request(app)
      .post('/api/compras')
      .set(SESION)
      .set('Content-Type', 'application/json')
      .send('{roto');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('La solicitud no tiene un formato válido');
  });

  it('el resultado de Mercado Pago debe indicar aprobado true o false', async () => {
    const inicio = await request(app).post('/api/compras').set(SESION).send(compraValida);
    const res = await request(app)
      .post(`/api/mercado-pago/${inicio.body.compra.id}/resultado`)
      .send({ aprobado: 'true' });
    expect(res.status).toBe(400);
    const compra = await request(app).get(`/api/mercado-pago/${inicio.body.compra.id}`);
    expect(compra.body.estado).toBe('PENDIENTE_MERCADO_PAGO');
  });

  it('responde 500 con un mensaje genérico ante un error inesperado', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const repositorioRoto = new RepositorioComprasEnMemoria();
    repositorioRoto.listar = () => Promise.reject(new Error('base caída'));
    const appRota = crearApp({ reloj: relojFijo, repositorio: repositorioRoto });
    const res = await request(appRota).post('/api/compras').set(SESION).send(compraValida);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Ocurrió un error inesperado');
  });

  it('GET /api/compras/:id devuelve la compra y su estado', async () => {
    const inicio = await request(app).post('/api/compras').set(SESION).send(compraValida);
    const res = await request(app).get(`/api/compras/${inicio.body.compra.id}`).set(SESION);
    expect(res.status).toBe(200);
    expect(res.body.compra).toMatchObject({ id: inicio.body.compra.id, estado: 'PENDIENTE_MERCADO_PAGO' });
    expect(res.body.mensaje).toBe('Mercado Pago todavía no acreditó el pago de esta compra');
  });

  it('GET /api/compras/:id responde 401 sin sesión y 404 si la compra no existe', async () => {
    expect((await request(app).get('/api/compras/000001')).status).toBe(401);
    expect((await request(app).get('/api/compras/999').set(SESION)).status).toBe(404);
  });

  it('confirma la compra cuando Mercado Pago informa el pago aprobado (CP-49)', async () => {
    const conMercadoPago = crearApp({ reloj: relojFijo, email, pasarela: mercadoPagoConPago('APROBADO') });
    const inicio = await request(conMercadoPago).post('/api/compras').set(SESION).send(compraValida);
    expect(inicio.body.urlPago).toBe('https://mercadopago.test/checkout/000001');

    const res = await request(conMercadoPago).post('/api/mercado-pago/pagos/123/confirmacion').set(SESION);
    expect(res.status).toBe(200);
    expect(res.body.compra.estado).toBe('CONFIRMADA');
    expect(res.body.mensaje).toBe('Compraste 2 entradas para el 17/10/2026');
    expect(email.enviados).toHaveLength(1);
  });

  it('la confirmación del pago responde 401 sin sesión y 404 si el pago no existe', async () => {
    const conMercadoPago = crearApp({ reloj: relojFijo, pasarela: mercadoPagoConPago('APROBADO') });
    await request(conMercadoPago).post('/api/compras').set(SESION).send(compraValida);
    expect((await request(conMercadoPago).post('/api/mercado-pago/pagos/123/confirmacion')).status).toBe(401);
    const inexistente = await request(conMercadoPago).post('/api/mercado-pago/pagos/999/confirmacion').set(SESION);
    expect(inexistente.status).toBe(404);
    expect(inexistente.body.error).toBe('El pago no existe');
  });

  it('responde 502 si no se puede conectar con Mercado Pago', async () => {
    const caido: PasarelaPago = {
      crearPago: () => Promise.reject(new ErrorCompra('No se pudo conectar con Mercado Pago', 'PASARELA')),
      consultarPago: () => Promise.reject(new ErrorCompra('No se pudo conectar con Mercado Pago', 'PASARELA')),
    };
    const res = await request(crearApp({ reloj: relojFijo, pasarela: caido }))
      .post('/api/compras')
      .set(SESION)
      .send(compraValida);
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('No se pudo conectar con Mercado Pago');
  });

  it('flujo completo en efectivo (CP-50)', async () => {
    const res = await request(app)
      .post('/api/compras')
      .set(SESION)
      .send({ ...compraValida, formaPago: 'EFECTIVO' });
    expect(res.status).toBe(201);
    expect(res.body.compra.estado).toBe('PENDIENTE_PAGO_BOLETERIA');
    expect(res.body.urlPago).toBeUndefined();
    expect(email.enviados).toHaveLength(1);
  });
});
