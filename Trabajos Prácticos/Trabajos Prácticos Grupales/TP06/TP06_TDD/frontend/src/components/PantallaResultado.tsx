import { useEffect, useState } from 'react';
import { api, type EmailEnviado, type ResultadoCompra } from '../api';
import { capitalizar, formatearFechaLarga, formatearPesos, pluralizar } from '../formato';
import { Icono } from './Icono';
import { ModalEmail } from './ModalEmail';

interface Props {
  resultado: ResultadoCompra;
  onNuevaCompra: () => void;
}

export function PantallaResultado({ resultado, onNuevaCompra }: Props) {
  const { compra, mensaje } = resultado;
  const rechazada = compra.estado === 'RECHAZADA';
  const pendiente = compra.estado === 'PENDIENTE_PAGO_BOLETERIA';
  const [email, setEmail] = useState<EmailEnviado | null>(null);
  const [mostrarEmail, setMostrarEmail] = useState(false);

  useEffect(() => {
    if (rechazada) return;
    api
      .emails()
      .then((enviados) => {
        const delaCompra = enviados.findLast((e) => e.cuerpo.includes(`Orden: ${compra.id}`));
        if (delaCompra) {
          setEmail(delaCompra);
        }
      })
      // Si no se puede leer la bandeja simulada, el resultado de la compra se sigue mostrando.
      .catch(() => setEmail(null));
  }, [rechazada, compra.id]);

  return (
    <section className="resultado">
      <div className={`resultado__icono ${rechazada ? 'resultado__icono--error' : ''}`} aria-hidden="true">
        <Icono nombre={rechazada ? 'cerrar' : pendiente ? 'reloj' : 'check'} />
      </div>
      <h1>
        {rechazada ? 'No pudimos procesar tu pago' : pendiente ? '¡Entradas registradas!' : '¡Compra confirmada!'}
      </h1>
      <p className="resultado__mensaje">{mensaje}</p>

      {!rechazada && (
        <div className="tarjeta">
          <dl className="datos">
            <div>
              <dt>Orden</dt>
              <dd>#{compra.id}</dd>
            </div>
            <div>
              <dt>Fecha de visita</dt>
              <dd>{capitalizar(formatearFechaLarga(compra.fechaVisita))}</dd>
            </div>
            <div>
              <dt>Cantidad</dt>
              <dd>{pluralizar(compra.cantidad, 'entrada')}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{formatearPesos(compra.total)}</dd>
            </div>
            <div>
              <dt>Pago</dt>
              <dd>
                {pendiente ? (
                  <span className="estado estado--pendiente">Pendiente en boletería</span>
                ) : (
                  <span className="estado estado--ok">Pagado con Mercado Pago</span>
                )}
              </dd>
            </div>
          </dl>
          <h2 className="subtitulo">Tus entradas</h2>
          <ul className="entradas">
            {compra.entradas.map((e) => (
              <li key={e.codigo} className="entrada">
                <span className="entrada__codigo">{e.codigo}</span>
                <span>
                  {e.tipoPase === 'VIP' ? 'VIP' : 'Regular'} · {pluralizar(e.edad, 'año')} · {formatearPesos(e.precio)}
                </span>
              </li>
            ))}
          </ul>
          {email && (
            <div className="confirmacion-correo">
              <p>
                <Icono nombre="correo" /> Enviamos la confirmación a <strong>{email.destinatario}</strong>.
              </p>
              <button
                id="ver-correo"
                type="button"
                className="boton boton--secundario boton--bloque"
                onClick={() => setMostrarEmail(true)}
              >
                Ver mail enviado
              </button>
            </div>
          )}
        </div>
      )}

      {rechazada && (
        <p className="resultado__reintento">Podés revisar los datos de tu visita y volver a intentar el pago.</p>
      )}
      <button type="button" className="boton boton--primario boton--bloque boton--grande" onClick={onNuevaCompra}>
        {rechazada ? 'Volver a intentar' : 'Comprar más entradas'}
      </button>

      {email && mostrarEmail && <ModalEmail email={email} onCerrar={() => setMostrarEmail(false)} />}
    </section>
  );
}
