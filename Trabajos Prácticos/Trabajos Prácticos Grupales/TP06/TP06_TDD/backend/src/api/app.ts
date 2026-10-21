import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { CompraEntradasService } from '../dominio/compraEntradas';
import { ErrorCompra, type TipoError } from '../dominio/errores';
import { sumarDias } from '../dominio/fechas';
import { porcentajeDescuentoPorEdad, PRECIOS_BASE } from '../dominio/precios';
import type { PasarelaPago, Reloj, RepositorioCompras } from '../dominio/puertos';
import { MAXIMO_ENTRADAS_POR_FECHA } from '../dominio/reglasEntradas';
import { fechaMaximaDeCompra, HORA_LIMITE_COMPRA_MISMO_DIA, parqueAbierto } from '../dominio/reglasFecha';
import { EmailSimulado } from '../infraestructura/emailSimulado';
import { MercadoPagoSimulado } from '../infraestructura/mercadoPagoSimulado';
import { RelojArgentina } from '../infraestructura/relojArgentina';
import { RepositorioComprasEnMemoria } from '../infraestructura/repositorioComprasEnMemoria';
import { usuarioDeSesion } from '../infraestructura/sesionesSimuladas';

const STATUS_POR_TIPO_ERROR: Record<TipoError, number> = {
  VALIDACION: 400,
  NO_AUTENTICADO: 401,
  NO_ENCONTRADO: 404,
  PASARELA: 502,
};

interface Dependencias {
  reloj?: Reloj;
  email?: EmailSimulado;
  repositorio?: RepositorioCompras;
  pasarela?: PasarelaPago;
}

export function crearApp({
  reloj = new RelojArgentina(),
  email = new EmailSimulado(),
  repositorio = new RepositorioComprasEnMemoria(),
  pasarela = new MercadoPagoSimulado(),
}: Dependencias = {}) {
  const servicio = new CompraEntradasService(repositorio, pasarela, email, reloj);
  const app = express();
  app.use(cors());
  app.use(express.json());

  const usuario = (req: Request) => usuarioDeSesion(req.headers.authorization);

  app.get('/api/sesion', (req, res) => {
    const u = usuario(req);
    if (!u) return res.status(401).json({ error: 'No hay una sesión iniciada' });
    res.json(u);
  });

  app.get('/api/calendario', (_req, res) => {
    const ahora = reloj.ahora();
    const fechaMaxima = fechaMaximaDeCompra(ahora);
    const fechas = [];
    for (let fecha = ahora.fecha; fecha <= fechaMaxima; fecha = sumarDias(fecha, 1)) {
      const abierto = parqueAbierto(fecha);
      const fueraDeHorario = fecha === ahora.fecha && ahora.hora > HORA_LIMITE_COMPRA_MISMO_DIA;
      fechas.push({ fecha, abierto, disponible: abierto && !fueraDeHorario });
    }
    res.json({ hoy: ahora.fecha, fechaMaxima, horaLimiteMismoDia: HORA_LIMITE_COMPRA_MISMO_DIA, fechas });
  });

  app.get('/api/precios', (_req, res) => {
    res.json({
      preciosBase: PRECIOS_BASE,
      maximoEntradasPorFecha: MAXIMO_ENTRADAS_POR_FECHA,
      descuentos: [
        { descripcion: 'Hasta 3 años', porcentaje: porcentajeDescuentoPorEdad(3) },
        { descripcion: 'De 4 a 15 años', porcentaje: porcentajeDescuentoPorEdad(4) },
        { descripcion: '60 años o más', porcentaje: porcentajeDescuentoPorEdad(60) },
      ],
    });
  });

  app.post('/api/compras/cotizacion', (req, res) => {
    res.json(servicio.cotizar(req.body));
  });

  app.post('/api/compras', async (req, res) => {
    res.status(201).json(await servicio.iniciarCompra(usuario(req), req.body));
  });

  app.get('/api/compras/:id', async (req, res) => {
    res.json(await servicio.obtenerCompra(usuario(req), req.params.id));
  });

  // Retorno desde el checkout de Mercado Pago: el estado del pago se consulta a su API.
  app.post('/api/mercado-pago/pagos/:pagoId/confirmacion', async (req, res) => {
    res.json(await servicio.confirmarPagoMercadoPago(usuario(req), req.params.pagoId));
  });

  app.get('/api/mercado-pago/:id', async (req, res) => {
    const compra = await repositorio.buscarPorId(req.params.id);
    if (!compra) return res.status(404).json({ error: 'La compra no existe' });
    res.json({ id: compra.id, total: compra.total, cantidad: compra.cantidad, estado: compra.estado });
  });

  app.post('/api/mercado-pago/:id/resultado', async (req, res) => {
    const aprobado = req.body?.aprobado;
    if (typeof aprobado !== 'boolean') {
      return res.status(400).json({ error: 'El resultado del pago debe indicar si fue aprobado (true o false)' });
    }
    res.json(await servicio.registrarResultadoPago(req.params.id, aprobado));
  });

  app.get('/api/emails', (req, res) => {
    const u = usuario(req);
    if (!u) return res.status(401).json({ error: 'No hay una sesión iniciada' });
    res.json(email.enviadosA(u.email));
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof SyntaxError) {
      return res.status(400).json({ error: 'La solicitud no tiene un formato válido' });
    }
    if (error instanceof ErrorCompra) {
      return res.status(STATUS_POR_TIPO_ERROR[error.tipo]).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Ocurrió un error inesperado' });
  });

  return app;
}
