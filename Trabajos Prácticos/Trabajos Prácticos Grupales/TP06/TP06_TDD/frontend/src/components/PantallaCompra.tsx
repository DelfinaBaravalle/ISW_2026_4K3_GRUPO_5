import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  api,
  type Calendario as DatosCalendario,
  type Cotizacion,
  type FormaPago,
  type Precios,
  type ResultadoCompra,
  type Usuario,
  type VisitanteForm,
} from '../api';
import { guardarBorrador } from '../borradorGuardado';
import { capitalizar, formatearFechaLarga, formatearPesos, pluralizar } from '../formato';
import { esUrlExterna, irAUrlExterna, navegar } from '../navegacion';
import { Icono } from './Icono';
import { BarraResumen } from './BarraResumen';
import { Calendario } from './Calendario';
import { ajustarVisitantes, ListaVisitantes } from './ListaVisitantes';

export interface BorradorCompra {
  fecha: string;
  cantidad: number | '';
  visitantes: VisitanteForm[];
  formaPago: FormaPago | '';
}

interface Props {
  borrador?: BorradorCompra | null;
  onBorradorChange?: (borrador: BorradorCompra) => void;
  /** undefined = todavía se está cargando la sesión; null = no hay sesión. */
  usuario: Usuario | null | undefined;
  onFinalizar: (resultado: ResultadoCompra) => void;
}

/** Respuesta del backend asociada a los datos con los que se pidió. */
interface RespuestaCotizacion {
  clave: string;
  cotizacion?: Cotizacion;
  error?: string;
}

function visitantesCompletos(visitantes: VisitanteForm[]) {
  return visitantes.every((v) => v.edad !== '' && v.tipoPase !== '');
}

export function PantallaCompra({ usuario, onFinalizar, borrador, onBorradorChange }: Props) {
  const [calendario, setCalendario] = useState<DatosCalendario | null>(null);
  const [precios, setPrecios] = useState<Precios | null>(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [fecha, setFecha] = useState(borrador?.fecha ?? '');
  const [cantidad, setCantidad] = useState<number | ''>(borrador?.cantidad ?? 1);
  const [visitantes, setVisitantes] = useState<VisitanteForm[]>(borrador?.visitantes ?? ajustarVisitantes([], 1));
  const [formaPago, setFormaPago] = useState<FormaPago | ''>(borrador?.formaPago ?? '');
  const [respuestaCotizacion, setRespuestaCotizacion] = useState<RespuestaCotizacion | null>(null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const reservaVisitantes = useRef<VisitanteForm[]>(borrador?.visitantes ?? []);
  useEffect(() => {
    reservaVisitantes.current = [...visitantes, ...reservaVisitantes.current.slice(visitantes.length)];
  }, [visitantes]);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    onBorradorChange?.({ fecha, cantidad, visitantes, formaPago });
  }, [fecha, cantidad, visitantes, formaPago, onBorradorChange]);
  const maximo = precios?.maximoEntradasPorFecha ?? 10;

  useEffect(() => {
    Promise.all([api.calendario(), api.precios()])
      .then(([datosCalendario, datosPrecios]) => {
        setCalendario(datosCalendario);
        setPrecios(datosPrecios);
      })
      .catch((e: Error) => setErrorCarga(e.message));
  }, []);

  const cambiarCantidad = (valor: number | '') => {
    setCantidad(valor);
    if (valor !== '' && Number.isInteger(valor) && valor >= 1) {
      setVisitantes((actuales) =>
        ajustarVisitantes([...actuales, ...reservaVisitantes.current.slice(actuales.length)], Math.min(valor, maximo)),
      );
    }
  };

  const solicitud = () => ({
    fechaVisita: fecha,
    cantidad: cantidad === '' ? (undefined as unknown as number) : cantidad,
    visitantes,
    formaPago: formaPago || undefined,
  });

  // Cotización en vivo: el precio lo calcula siempre el backend. Solo se muestra la respuesta
  // que corresponde a los datos actuales del formulario (las respuestas viejas se descartan).
  const datosCompletos =
    fecha !== '' && cantidad !== '' && visitantes.length === cantidad && visitantesCompletos(visitantes);
  const claveCotizacion = datosCompletos ? JSON.stringify({ fechaVisita: fecha, cantidad, visitantes }) : null;

  useEffect(() => {
    if (!claveCotizacion) return;
    let vigente = true;
    api
      .cotizar(JSON.parse(claveCotizacion))
      .then((cotizacion) => vigente && setRespuestaCotizacion({ clave: claveCotizacion, cotizacion }))
      .catch((e: Error) => vigente && setRespuestaCotizacion({ clave: claveCotizacion, error: e.message }));
    return () => {
      vigente = false;
    };
  }, [claveCotizacion]);

  const respuestaVigente = respuestaCotizacion?.clave === claveCotizacion ? respuestaCotizacion : null;
  const cotizacion = respuestaVigente?.cotizacion;
  const errorCotizacion = respuestaVigente?.error;

  const confirmar = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const resultado = await api.comprar(solicitud());
      if (resultado.urlPago && esUrlExterna(resultado.urlPago)) {
        guardarBorrador({ fecha, cantidad, visitantes, formaPago });
        irAUrlExterna(resultado.urlPago);
      } else if (resultado.urlPago) navegar(resultado.urlPago);
      else onFinalizar(resultado);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  if (errorCarga) {
    return (
      <div className="estado-carga" role="alert">
        <Icono nombre="info" />
        <h1>No pudimos cargar la compra</h1>
        <p>{errorCarga}</p>
        <button className="boton boton--primario" onClick={() => window.location.reload()}>
          Volver a cargar
        </button>
      </div>
    );
  }
  if (!calendario || !precios) {
    return (
      <div className="estado-carga" role="status">
        <Icono nombre="cargando" className="girando" />
        <p>Cargando entradas…</p>
      </div>
    );
  }

  const cantidadInvalida = cantidad !== '' && (cantidad < 1 || cantidad > maximo || !Number.isInteger(cantidad));
  const cotizando = datosCompletos && !respuestaVigente;

  return (
    <form className="compra" onSubmit={confirmar} noValidate aria-busy={enviando}>
      <div className="compra__titulo">
        <div>
          <h1>Comprar entradas</h1>
          <p>Elegí tu día, armá tu visita y disfrutá del parque.</p>
        </div>
        <span className="horario-parque">
          <Icono nombre="reloj" /> Martes a domingo · 8:30 a 19 h
        </span>
      </div>
      {usuario === null && (
        <div className="alerta" role="alert">
          Debés iniciar sesión para comprar entradas.
        </div>
      )}
      <div className="compra__distribucion">
        <div className="compra__formulario">
          <section className="seccion seccion-fecha" id="fecha-visita" aria-labelledby="titulo-fecha">
            <div className="seccion__cabecera">
              <span className="paso__numero">1</span>
              <div>
                <h2 id="titulo-fecha">Elegí la fecha</h2>
                <p>Seleccioná un día disponible para tu visita.</p>
              </div>
            </div>
            <div className="fecha__distribucion">
              <Calendario datos={calendario} seleccionada={fecha} onSeleccionar={setFecha} />
              <div className="fecha__informacion">
                <div className={`fecha__seleccion ${fecha ? 'fecha__seleccion--elegida' : ''}`} aria-live="polite">
                  <Icono nombre={fecha ? 'check' : 'calendario'} />
                  <div>
                    <span>{fecha ? 'Tu fecha de visita' : 'Un día para disfrutar'}</span>
                    <strong>{fecha ? capitalizar(formatearFechaLarga(fecha)) : 'Elegí tu día en el calendario'}</strong>
                  </div>
                </div>
                <ul className="reglas-visita">
                  <li>
                    <Icono nombre="reloj" />
                    <span>
                      Abierto de <strong>8:30 a 19 h.</strong>
                    </span>
                  </li>
                  <li>
                    <Icono nombre="info" />
                    <span>Cerrado los lunes, el 25/12 y el 1/1.</span>
                  </li>
                </ul>
                <p className="ayuda">
                  Hasta un mes de anticipación. Para visitar hoy, comprá antes de las {calendario.horaLimiteMismoDia} h.
                </p>
              </div>
            </div>
          </section>
          <section className="seccion seccion-visitantes" id="visitantes" aria-labelledby="titulo-visitantes">
            <div className="seccion__cabecera seccion__cabecera--cantidad">
              <span className="paso__numero">2</span>
              <div>
                <h2 id="titulo-visitantes">¿Quiénes vienen?</h2>
                <p>Una entrada por persona, también para los más chicos.</p>
              </div>
              <div className="cantidad">
                <label htmlFor="cantidad-entradas">Entradas</label>
                <div className="contador">
                  <button
                    type="button"
                    className="contador__boton"
                    aria-label="Quitar una entrada"
                    disabled={cantidad === '' || cantidad <= 1}
                    onClick={() => cambiarCantidad(Number(cantidad) - 1)}
                  >
                    <Icono nombre="menos" />
                  </button>
                  <input
                    id="cantidad-entradas"
                    name="cantidad"
                    className="contador__valor"
                    type="number"
                    inputMode="numeric"
                    autoComplete="off"
                    min={1}
                    max={maximo}
                    step={1}
                    aria-label="Cantidad de entradas"
                    aria-describedby="ayuda-cantidad"
                    aria-invalid={cantidadInvalida || undefined}
                    value={cantidad}
                    onChange={(e) => cambiarCantidad(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  <button
                    type="button"
                    className="contador__boton"
                    aria-label="Agregar una entrada"
                    disabled={cantidad !== '' && cantidad >= maximo}
                    onClick={() => cambiarCantidad(Number(cantidad) + 1)}
                  >
                    <Icono nombre="mas" />
                  </button>
                </div>
              </div>
            </div>
            <p id="ayuda-cantidad" className={cantidadInvalida ? 'ayuda ayuda--error' : 'ayuda'}>
              Máximo {maximo} entradas por fecha, sumando todas tus compras.
            </p>
            <div className="beneficios">
              <Icono nombre="entrada" />
              <p>
                Hasta 3 años: <strong>sin cargo.</strong> De 4 a 15 años y desde los 60:{' '}
                <strong>50% de descuento.</strong>
              </p>
            </div>
            <ListaVisitantes
              visitantes={visitantes}
              preciosBase={precios.preciosBase}
              cotizacion={cotizacion}
              onCambiar={setVisitantes}
            />
            <p className="ayuda ayuda-pases">
              Regular y VIP se diferencian en el precio. El descuento por edad se aplica a ambos pases.
            </p>
          </section>
          <section className="seccion seccion-pago" id="forma-pago" aria-labelledby="titulo-pago">
            <div className="seccion__cabecera">
              <span className="paso__numero">3</span>
              <div>
                <h2 id="titulo-pago">¿Cómo querés pagar?</h2>
                <p>Elegí la opción que te quede más cómoda.</p>
              </div>
            </div>
            <div className="formas-pago" role="radiogroup" aria-label="Forma de pago">
              {(
                [
                  ['TARJETA', 'tarjeta', 'Tarjeta', 'Continuás a Mercado Pago para pagar online.'],
                  ['EFECTIVO', 'efectivo', 'Efectivo', 'Pagás en la boletería el día de tu visita.'],
                ] as const
              ).map(([valor, icono, titulo, detalle]) => (
                <label key={valor} className={`forma-pago ${formaPago === valor ? 'forma-pago--activa' : ''}`}>
                  <input
                    type="radio"
                    name="formaPago"
                    value={valor}
                    checked={formaPago === valor}
                    onChange={() => setFormaPago(valor)}
                  />
                  <Icono nombre={icono} />
                  <span className="forma-pago__texto">
                    <strong>{titulo}</strong>
                    <span>{detalle}</span>
                  </span>
                  <span className="control-radio" aria-hidden="true" />
                </label>
              ))}
            </div>
          </section>
        </div>
        <aside className="compra__lateral" aria-label="Resumen de tu visita">
          <section className="resumen" id="resumen-compra" aria-labelledby="titulo-resumen">
            <div className="resumen__cabecera">
              <h2 id="titulo-resumen">Tu visita al parque</h2>
              <Icono nombre="entrada" />
            </div>
            <dl className="resumen__datos">
              <div>
                <dt>Fecha</dt>
                <dd>{fecha ? capitalizar(formatearFechaLarga(fecha)) : <a href="#fecha-visita">Elegir fecha</a>}</dd>
              </div>
              <div>
                <dt>Visitantes</dt>
                <dd>
                  {cantidad !== '' && cantidad > 0 && Number.isInteger(cantidad) ? (
                    pluralizar(cantidad, 'persona')
                  ) : (
                    <a href="#visitantes">Definir cantidad</a>
                  )}
                </dd>
              </div>
              <div>
                <dt>Pago</dt>
                <dd>
                  {formaPago === 'TARJETA' ? (
                    'Tarjeta'
                  ) : formaPago === 'EFECTIVO' ? (
                    'En boletería'
                  ) : (
                    <a href="#forma-pago">Elegir forma de pago</a>
                  )}
                </dd>
              </div>
            </dl>
            <div className="resumen__cotizacion" aria-live="polite" aria-atomic="true">
              {cotizacion ? (
                <ul className="resumen__lista">
                  {cotizacion.entradas.map((e, i) => (
                    <li key={i}>
                      <span>
                        Visitante {i + 1}
                        <small>
                          {e.tipoPase === 'VIP' ? 'VIP' : 'Regular'} · {pluralizar(e.edad, 'año')}
                          {e.porcentajeDescuento > 0 && (
                            <span className="etiqueta">
                              {e.porcentajeDescuento === 100 ? 'Sin cargo' : `−${e.porcentajeDescuento}%`}
                            </span>
                          )}
                        </small>
                      </span>
                      <strong>{formatearPesos(e.precio)}</strong>
                    </li>
                  ))}
                </ul>
              ) : errorCotizacion ? (
                <p className="ayuda ayuda--error">{errorCotizacion}</p>
              ) : (
                <p className="resumen__vacio">
                  {cotizando
                    ? 'Calculando tu total…'
                    : 'Completá la fecha, la edad y el pase de cada visitante para ver el total con descuentos.'}
                </p>
              )}
              <div className="resumen__total">
                <span>
                  Total<small>Pesos argentinos</small>
                </span>
                <strong>{cotizacion ? formatearPesos(cotizacion.total) : '—'}</strong>
              </div>
            </div>
            <div className="resumen__accion">
              {error && (
                <div className="alerta" role="alert" ref={errorRef} tabIndex={-1}>
                  {error}
                  <nav className="alerta__enlaces" aria-label="Revisar datos de la compra">
                    <a href="#fecha-visita">Fecha</a>
                    <a href="#visitantes">Visitantes</a>
                    <a href="#forma-pago">Pago</a>
                  </nav>
                </div>
              )}
              <button type="submit" className="boton boton--primario boton--bloque" disabled={enviando}>
                {enviando ? (
                  <>
                    <Icono nombre="cargando" className="girando" /> Procesando…
                  </>
                ) : (
                  <>
                    {formaPago === 'TARJETA' ? 'Ir a pagar con Mercado Pago' : 'Confirmar compra'}
                    <Icono nombre="flecha" />
                  </>
                )}
              </button>
              <p>
                <Icono nombre="correo" /> Recibís tus entradas por mail.
              </p>
              {formaPago === 'EFECTIVO' && (
                <p className="resumen__aclaracion">La compra queda pendiente de pago en boletería.</p>
              )}
            </div>
          </section>
          <p className="resumen__ayuda">
            <Icono nombre="hoja" /> Todo listo para un día al aire libre.
          </p>
        </aside>
      </div>
      <BarraResumen total={cotizacion?.total} />
    </form>
  );
}
