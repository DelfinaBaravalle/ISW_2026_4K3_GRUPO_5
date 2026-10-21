import { useEffect, useState } from 'react';
import { api, type ResultadoCompra } from '../api';
import { Icono } from './Icono';
import { formatearPesos, pluralizar } from '../formato';

interface Props {
  compraId: string;
  onFinalizar: (resultado: ResultadoCompra) => void;
}

type DatosPago = Awaited<ReturnType<typeof api.compraMercadoPago>>;

/** Simulación del checkout de Mercado Pago (FAQ 4). */
export function PantallaMercadoPago({ compraId, onFinalizar }: Props) {
  const [datos, setDatos] = useState<DatosPago | null>(null);
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    api
      .compraMercadoPago(compraId)
      .then(setDatos)
      .catch((e: Error) => setError(e.message));
  }, [compraId]);

  const responder = async (aprobado: boolean) => {
    setProcesando(true);
    try {
      onFinalizar(await api.resultadoMercadoPago(compraId, aprobado));
    } catch (e) {
      setError((e as Error).message);
      setProcesando(false);
    }
  };

  return (
    <div className="mp">
      <div className="mp__barra">
        <span className="mp__logo">mercado pago</span>
        <span className="mp__simulacion">Simulación</span>
      </div>
      <div className="mp__tarjeta">
        {error && <div className="alerta alerta--error">{error}</div>}
        {!datos && !error && <p className="cargando">Cargando…</p>}
        {datos && (
          <>
            <p className="mp__comercio">EcoHarmony Park</p>
            <p className="mp__concepto">
              {pluralizar(datos.cantidad, 'entrada')} · Orden #{datos.id}
            </p>
            <p className="mp__monto">{formatearPesos(datos.total)}</p>
            {datos.estado === 'PENDIENTE_MERCADO_PAGO' ? (
              <>
                <div className="mp__medio">
                  <Icono nombre="tarjeta" /> Visa terminada en 4242 (de prueba)
                </div>
                <button
                  type="button"
                  className="boton mp__pagar boton--bloque"
                  disabled={procesando}
                  onClick={() => responder(true)}
                >
                  {procesando ? 'Procesando…' : 'Pagar'}
                </button>
                <button
                  type="button"
                  className="boton mp__rechazar boton--bloque"
                  disabled={procesando}
                  onClick={() => responder(false)}
                >
                  Simular pago rechazado
                </button>
              </>
            ) : (
              <p className="ayuda">Esta orden ya fue procesada.</p>
            )}
          </>
        )}
      </div>
      <p className="mp__nota">Pantalla simulada para el TP. No se realiza ningún cobro real.</p>
    </div>
  );
}
