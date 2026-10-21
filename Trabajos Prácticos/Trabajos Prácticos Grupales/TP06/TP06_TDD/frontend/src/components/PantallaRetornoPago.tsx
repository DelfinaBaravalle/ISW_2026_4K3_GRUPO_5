import { useEffect, useState } from 'react';
import { api, type ResultadoCompra } from '../api';
import { navegar } from '../navegacion';
import { Icono } from './Icono';

interface Props {
  onFinalizar: (resultado: ResultadoCompra) => void;
}

/** Datos que agrega Mercado Pago a la URL de retorno. Si no se pagó, payment_id llega como "null". */
function datosDelRetorno() {
  const parametros = new URLSearchParams(window.location.search);
  const pagoId = parametros.get('payment_id');
  return {
    compraId: parametros.get('compra') ?? parametros.get('external_reference'),
    pagoId: pagoId && pagoId !== 'null' ? pagoId : null,
  };
}

/** Pantalla a la que vuelve el comprador desde el checkout de Mercado Pago. */
export function PantallaRetornoPago({ onFinalizar }: Props) {
  const [{ compraId, pagoId }] = useState(datosDelRetorno);
  const [pendiente, setPendiente] = useState<ResultadoCompra | null>(null);
  const [error, setError] = useState('');
  const [consultas, setConsultas] = useState(0);

  useEffect(() => {
    let vigente = true;
    // Con un pago se le pide al backend que lo confirme con Mercado Pago; sin pago solo se consulta la compra.
    const consulta = pagoId
      ? api.confirmarPagoMercadoPago(pagoId)
      : compraId
        ? api.compra(compraId)
        : Promise.reject(new Error('No encontramos la compra asociada al pago'));
    consulta
      .then((resultado) => {
        if (!vigente) return;
        if (resultado.compra.estado === 'PENDIENTE_MERCADO_PAGO') setPendiente(resultado);
        else onFinalizar(resultado);
      })
      .catch((e: Error) => vigente && setError(e.message));
    return () => {
      vigente = false;
    };
  }, [compraId, pagoId, consultas, onFinalizar]);

  const consultarDeNuevo = () => {
    setError('');
    setPendiente(null);
    setConsultas((n) => n + 1);
  };

  if (error) {
    return (
      <div className="estado-carga" role="alert">
        <Icono nombre="info" />
        <h1>No pudimos confirmar tu pago</h1>
        <p>{error}</p>
        <button type="button" className="boton boton--primario" onClick={consultarDeNuevo}>
          Consultar de nuevo
        </button>
      </div>
    );
  }
  if (pendiente && pagoId) {
    return (
      <div className="estado-carga">
        <Icono nombre="reloj" />
        <h1>Tu pago está en proceso</h1>
        <p>{pendiente.mensaje}. Podés consultar de nuevo en unos minutos.</p>
        <button type="button" className="boton boton--primario" onClick={consultarDeNuevo}>
          Consultar de nuevo
        </button>
      </div>
    );
  }
  if (pendiente) {
    return (
      <div className="estado-carga">
        <Icono nombre="info" />
        <h1>No completaste el pago</h1>
        <p>La orden #{pendiente.compra.id} no se pagó, así que no se confirmó ninguna entrada.</p>
        <button type="button" className="boton boton--primario" onClick={() => navegar('/')}>
          Volver a intentar
        </button>
      </div>
    );
  }
  return (
    <div className="estado-carga" role="status">
      <Icono nombre="cargando" className="girando" />
      <h1>Confirmando tu pago</h1>
      <p>Estamos consultando el resultado con Mercado Pago…</p>
    </div>
  );
}
