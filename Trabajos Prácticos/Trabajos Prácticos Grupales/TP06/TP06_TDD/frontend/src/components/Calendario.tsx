import { useMemo, useState } from 'react';
import { Icono } from './Icono';
import type { Calendario as DatosCalendario } from '../api';
import { capitalizar, MESES } from '../formato';

interface Props {
  datos: DatosCalendario;
  seleccionada: string;
  onSeleccionar: (fecha: string) => void;
}

const DIAS_SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

function claveMes(fecha: string) {
  return fecha.slice(0, 7); // AAAA-MM
}

function moverMes(mes: string, delta: number) {
  const [anio, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(anio, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

function diasDelMes(mes: string) {
  const [anio, m] = mes.split('-').map(Number);
  const cantidadDias = new Date(Date.UTC(anio, m, 0)).getUTCDate();
  // getUTCDay: 0 = domingo. La semana arranca el lunes.
  const huecosIniciales = (new Date(Date.UTC(anio, m - 1, 1)).getUTCDay() + 6) % 7;
  const dias = Array.from({ length: cantidadDias }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`);
  return { anio, m, huecosIniciales, dias };
}

export function Calendario({ datos, seleccionada, onSeleccionar }: Props) {
  const [mesVisible, setMesVisible] = useState(claveMes(seleccionada || datos.hoy));
  const porFecha = useMemo(() => new Map(datos.fechas.map((d) => [d.fecha, d])), [datos.fechas]);
  const { anio, m, huecosIniciales, dias } = diasDelMes(mesVisible);

  const hayMesAnterior = mesVisible > claveMes(datos.hoy);
  const hayMesSiguiente = mesVisible < claveMes(datos.fechaMaxima);

  return (
    <div className="calendario">
      <div className="calendario__cabecera">
        <button
          type="button"
          className="calendario__nav"
          aria-label="Mes anterior"
          disabled={!hayMesAnterior}
          onClick={() => setMesVisible(moverMes(mesVisible, -1))}
        >
          <Icono nombre="anterior" />
        </button>
        <span className="calendario__titulo">
          {capitalizar(MESES[m - 1])} {anio}
        </span>
        <button
          type="button"
          className="calendario__nav"
          aria-label="Mes siguiente"
          disabled={!hayMesSiguiente}
          onClick={() => setMesVisible(moverMes(mesVisible, 1))}
        >
          <Icono nombre="siguiente" />
        </button>
      </div>

      <div
        className="calendario__grilla"
        onKeyDown={(evento) => {
          const salto = ({ ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 } as Record<string, number>)[
            evento.key
          ];
          if (!salto || !(evento.target instanceof HTMLButtonElement)) return;
          evento.preventDefault();
          const botones = Array.from(evento.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
          let indice = botones.indexOf(evento.target) + salto;
          while (indice >= 0 && indice < botones.length) {
            if (!botones[indice].disabled) {
              botones[indice].focus();
              return;
            }
            indice += Math.sign(salto);
          }
        }}
      >
        {DIAS_SEMANA.map((d) => (
          <span key={d} className="calendario__dia-semana">
            {d}
          </span>
        ))}
        {Array.from({ length: huecosIniciales }, (_, i) => (
          <span key={`hueco-${i}`} />
        ))}
        {dias.map((fecha) => {
          const dia = porFecha.get(fecha);
          const disponible = dia?.disponible ?? false;
          const cerrado = dia ? !dia.abierto : false;
          const numero = Number(fecha.slice(8));
          const estado = disponible ? 'disponible' : cerrado ? 'parque cerrado' : 'no disponible';
          const clases = ['calendario__dia'];
          if (cerrado) clases.push('calendario__dia--cerrado');
          if (fecha === seleccionada) clases.push('calendario__dia--seleccionado');
          if (fecha === datos.hoy) clases.push('calendario__dia--hoy');
          return (
            <button
              key={fecha}
              type="button"
              className={clases.join(' ')}
              disabled={!disponible}
              aria-pressed={fecha === seleccionada}
              aria-label={`${numero} de ${MESES[m - 1]} de ${anio}, ${estado}`}
              title={cerrado ? 'El parque está cerrado este día' : undefined}
              onClick={() => onSeleccionar(fecha)}
            >
              {numero}
            </button>
          );
        })}
      </div>

      <div className="calendario__leyenda">
        <span>
          <i className="punto punto--disponible" /> Disponible
        </span>
        <span>
          <i className="punto punto--cerrado" /> Parque cerrado
        </span>
      </div>
    </div>
  );
}
