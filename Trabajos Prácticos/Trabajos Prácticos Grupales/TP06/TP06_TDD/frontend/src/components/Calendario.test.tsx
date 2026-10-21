import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Calendario as DatosCalendario } from '../api';
import { Calendario } from './Calendario';

const datos: DatosCalendario = {
  hoy: '2026-10-15',
  fechaMaxima: '2026-11-15',
  horaLimiteMismoDia: '17:30',
  fechas: [
    { fecha: '2026-10-15', abierto: true, disponible: true },
    { fecha: '2026-10-17', abierto: true, disponible: true },
    { fecha: '2026-10-19', abierto: false, disponible: false },
  ],
};

describe('Calendario', () => {
  it('muestra el mes de la fecha actual', () => {
    render(<Calendario datos={datos} seleccionada="" onSeleccionar={() => {}} />);
    expect(screen.getByText('Octubre 2026')).toBeInTheDocument();
  });

  it('deshabilita los días en que el parque está cerrado (lunes)', () => {
    render(<Calendario datos={datos} seleccionada="" onSeleccionar={() => {}} />);
    expect(screen.getByRole('button', { name: /19 de octubre/ })).toBeDisabled();
  });

  it('deshabilita los días fuera del rango de compra', () => {
    render(<Calendario datos={datos} seleccionada="" onSeleccionar={() => {}} />);
    expect(screen.getByRole('button', { name: /14 de octubre/ })).toBeDisabled();
  });

  it('permite seleccionar un día disponible', async () => {
    const onSeleccionar = vi.fn();
    render(<Calendario datos={datos} seleccionada="" onSeleccionar={onSeleccionar} />);
    await userEvent.click(screen.getByRole('button', { name: /17 de octubre/ }));
    expect(onSeleccionar).toHaveBeenCalledWith('2026-10-17');
  });

  it('marca el día seleccionado', () => {
    render(<Calendario datos={datos} seleccionada="2026-10-17" onSeleccionar={() => {}} />);
    expect(screen.getByRole('button', { name: /17 de octubre/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('permite pasar al mes siguiente y no más allá de la fecha máxima', async () => {
    render(<Calendario datos={datos} seleccionada="" onSeleccionar={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    expect(screen.getByText('Noviembre 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled();
  });
});
