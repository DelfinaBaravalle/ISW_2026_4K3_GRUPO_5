import { useCallback, useEffect, useState } from 'react';
import { api, type ResultadoCompra, type Usuario } from './api';
import { descartarBorradorGuardado, recuperarBorrador } from './borradorGuardado';
import { Encabezado } from './components/Encabezado';
import { PantallaCompra, type BorradorCompra } from './components/PantallaCompra';
import { PantallaMercadoPago } from './components/PantallaMercadoPago';
import { PantallaResultado } from './components/PantallaResultado';
import { PantallaRetornoPago } from './components/PantallaRetornoPago';
import { navegar, useRuta } from './navegacion';

export function App() {
  const ruta = useRuta();
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined);
  const [borrador, setBorrador] = useState<BorradorCompra | null>(recuperarBorrador);
  const [resultado, setResultado] = useState<ResultadoCompra | null>(null);

  useEffect(() => {
    api
      .sesion()
      .then(setUsuario)
      .catch(() => setUsuario(null));
  }, []);

  // El borrador guardado antes de ir a Mercado Pago solo se recupera una vez, al volver.
  useEffect(() => descartarBorradorGuardado(), []);

  // /resultado solo tiene sentido justo después de una compra (por ejemplo, no al recargar la página).
  useEffect(() => {
    if (ruta === '/resultado' && !resultado) {
      window.history.replaceState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [ruta, resultado]);

  const finalizar = useCallback((r: ResultadoCompra) => {
    setResultado(r);
    // La pantalla de retorno de Mercado Pago es de paso: no queda en el historial.
    navegar('/resultado', { reemplazar: window.location.pathname === '/pago/retorno' });
  }, []);

  const idMercadoPago = ruta.match(/^\/mercado-pago\/([^/]+)$/)?.[1];

  let pantalla;
  if (idMercadoPago) {
    pantalla = <PantallaMercadoPago compraId={idMercadoPago} onFinalizar={finalizar} />;
  } else if (ruta === '/pago/retorno') {
    pantalla = <PantallaRetornoPago onFinalizar={finalizar} />;
  } else if (ruta === '/resultado' && resultado) {
    pantalla = (
      <PantallaResultado
        resultado={resultado}
        onNuevaCompra={() => {
          if (resultado.compra.estado !== 'RECHAZADA') setBorrador(null);
          navegar('/');
        }}
      />
    );
  } else {
    pantalla = (
      <PantallaCompra usuario={usuario} onFinalizar={finalizar} borrador={borrador} onBorradorChange={setBorrador} />
    );
  }

  return (
    <>
      <a className="saltar-contenido" href="#contenido-principal">
        Ir al contenido
      </a>
      {!idMercadoPago && <Encabezado usuario={usuario ?? null} />}
      <main
        id="contenido-principal"
        tabIndex={-1}
        className={idMercadoPago ? 'contenedor contenedor--mp' : 'contenedor'}
      >
        {pantalla}
      </main>
      {!idMercadoPago && <footer className="pie">EcoHarmony Park · Abierto de martes a domingo de 8:30 a 19 h</footer>}
    </>
  );
}
