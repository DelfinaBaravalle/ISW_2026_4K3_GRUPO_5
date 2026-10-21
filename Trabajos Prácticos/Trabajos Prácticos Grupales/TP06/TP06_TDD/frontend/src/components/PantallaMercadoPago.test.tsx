import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import { PantallaMercadoPago } from './PantallaMercadoPago';

vi.mock('../api', () => ({ api: { compraMercadoPago: vi.fn(), resultadoMercadoPago: vi.fn() } }));
const mockApi = vi.mocked(api);

beforeEach(() => {
  vi.clearAllMocks();
  mockApi.compraMercadoPago.mockResolvedValue({
    id: '000001',
    total: 15000,
    cantidad: 2,
    estado: 'PENDIENTE_MERCADO_PAGO',
  });
  mockApi.resultadoMercadoPago.mockResolvedValue({ compra: { id: '000001' } as never, mensaje: 'ok' });
});

describe('PantallaMercadoPago', () => {
  it('muestra el total a pagar de la orden', async () => {
    render(<PantallaMercadoPago compraId="000001" onFinalizar={() => {}} />);
    expect(await screen.findByText('$15.000')).toBeInTheDocument();
    expect(screen.getByText(/2 entradas · Orden #000001/)).toBeInTheDocument();
  });

  it('PU-41: al pagar informa un pago aprobado', async () => {
    const onFinalizar = vi.fn();
    render(<PantallaMercadoPago compraId="000001" onFinalizar={onFinalizar} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Pagar' }));
    expect(mockApi.resultadoMercadoPago).toHaveBeenCalledWith('000001', true);
    await waitFor(() => expect(onFinalizar).toHaveBeenCalled());
  });

  it('PU-42: puede simular un pago rechazado', async () => {
    render(<PantallaMercadoPago compraId="000001" onFinalizar={() => {}} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Simular pago rechazado' }));
    expect(mockApi.resultadoMercadoPago).toHaveBeenCalledWith('000001', false);
  });

  it('no permite volver a pagar una orden ya procesada', async () => {
    mockApi.compraMercadoPago.mockResolvedValue({ id: '000001', total: 15000, cantidad: 2, estado: 'CONFIRMADA' });
    render(<PantallaMercadoPago compraId="000001" onFinalizar={() => {}} />);
    expect(await screen.findByText('Esta orden ya fue procesada.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pagar' })).not.toBeInTheDocument();
  });

  it('muestra el error si la orden no existe', async () => {
    mockApi.compraMercadoPago.mockRejectedValue(new Error('La compra no existe'));
    render(<PantallaMercadoPago compraId="999" onFinalizar={() => {}} />);
    expect(await screen.findByText('La compra no existe')).toBeInTheDocument();
  });

  it('muestra el error si falla el registro del pago', async () => {
    mockApi.resultadoMercadoPago.mockRejectedValue(new Error('Sin conexión'));
    render(<PantallaMercadoPago compraId="000001" onFinalizar={() => {}} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Pagar' }));
    expect(await screen.findByText('Sin conexión')).toBeInTheDocument();
  });
});
