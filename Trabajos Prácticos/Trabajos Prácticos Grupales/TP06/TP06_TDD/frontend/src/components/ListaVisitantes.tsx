import type { Cotizacion, TipoPase, VisitanteForm } from '../api';
import { formatearPesos } from '../formato';
import { Icono } from './Icono';

const VISITANTE_VACIO: VisitanteForm = { edad: '', tipoPase: '' };

export function ajustarVisitantes(visitantes: VisitanteForm[], cantidad: number): VisitanteForm[] {
  if (visitantes.length >= cantidad) return visitantes.slice(0, cantidad);
  return [...visitantes, ...Array.from({ length: cantidad - visitantes.length }, () => ({ ...VISITANTE_VACIO }))];
}

interface Props {
  visitantes: VisitanteForm[];
  preciosBase: Record<TipoPase, number>;
  cotizacion?: Cotizacion;
  onCambiar: (visitantes: VisitanteForm[]) => void;
}

export function ListaVisitantes({ visitantes, preciosBase, cotizacion, onCambiar }: Props) {
  const cambiar = (indice: number, cambios: Partial<VisitanteForm>) =>
    onCambiar(visitantes.map((v, i) => (i === indice ? { ...v, ...cambios } : v)));

  return (
    <ol className="visitantes">
      {visitantes.map((visitante, i) => (
        <li key={i} className="visitante">
          <div className="visitante__identidad">
            <span className="visitante__numero">
              <Icono nombre="persona" />
            </span>
            <strong>Visitante {i + 1}</strong>
          </div>
          <label className="visitante__edad">
            <span>Edad</span>
            <span className="visitante__campo">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={120}
                step={1}
                name={`edad-${i}`}
                autoComplete="off"
                aria-label={`Edad del visitante ${i + 1}`}
                value={visitante.edad}
                onChange={(e) => cambiar(i, { edad: e.target.value === '' ? '' : Number(e.target.value) })}
              />
              <span className="visitante__sufijo">años</span>
            </span>
          </label>
          <div className="pase" role="radiogroup" aria-label={`Tipo de pase del visitante ${i + 1}`}>
            {(Object.keys(preciosBase) as TipoPase[]).map((tipo) => (
              <label key={tipo} className={`pase__opcion ${visitante.tipoPase === tipo ? 'pase__opcion--activa' : ''}`}>
                <input
                  type="radio"
                  name={`pase-${i}`}
                  value={tipo}
                  checked={visitante.tipoPase === tipo}
                  onChange={() => cambiar(i, { tipoPase: tipo })}
                />
                <span className="pase__titulo">
                  <span className="pase__nombre">{tipo === 'VIP' ? 'VIP' : 'Regular'}</span>
                  <span className="control-radio" aria-hidden="true" />
                </span>
                <span className="pase__precio">{formatearPesos(preciosBase[tipo])}</span>
                <span className="pase__aclaracion">Base, sin descuento</span>
              </label>
            ))}
          </div>
          {cotizacion?.entradas[i] && (
            <p className="visitante__importe">
              <span>
                {cotizacion.entradas[i].porcentajeDescuento === 100
                  ? 'Sin cargo por edad'
                  : cotizacion.entradas[i].porcentajeDescuento > 0
                    ? `Con ${cotizacion.entradas[i].porcentajeDescuento}% de descuento`
                    : 'Importe de esta entrada'}
              </span>
              <strong>{formatearPesos(cotizacion.entradas[i].precio)}</strong>
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
