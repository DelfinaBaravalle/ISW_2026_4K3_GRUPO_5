import { useEffect, useState } from 'react';
import { formatearPesos } from '../formato';
import { Icono } from './Icono';

export function BarraResumen({ total }: { total?: number }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const resumen = document.getElementById('resumen-compra');
    if (!resumen || typeof IntersectionObserver === 'undefined') return;
    const observador = new IntersectionObserver(([entrada]) => setVisible(!entrada.isIntersecting), { threshold: 0.1 });
    observador.observe(resumen);
    return () => observador.disconnect();
  }, []);
  return (
    <div className={`barra-resumen ${visible ? '' : 'barra-resumen--oculta'}`}>
      <div>
        <span>Tu total</span>
        <strong>{total === undefined ? 'A calcular' : formatearPesos(total)}</strong>
      </div>
      <a className="boton boton--primario" href="#resumen-compra">
        Ver resumen <Icono nombre="flecha" />
      </a>
    </div>
  );
}
