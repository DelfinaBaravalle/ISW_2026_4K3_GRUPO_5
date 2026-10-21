import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, type EstadoCompra } from '../api';
import { PantallaRetornoPago } from './PantallaRetornoPago';

vi.mock('../api', () => ({ api: { confirmarPagoMercadoPago: vi.fn(), compra: vi.fn() } }));
const mockApi = vi.mocked(api);

function resultado(estado: EstadoCompra, mensaje = '') {
  return { compra: { id: '000001', estado } as never, mensaje };
}

/** Mercado Pago agrega estos parámetros a la URL de retorno. */
function volverDeMercadoPago(parametros: string) {
  window.history.pushState({}, '', `/pago/retorno?compra=000001&${parametros}`);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PantallaRetornoPago', () => {
  it('PU-41: con el pago aprobado confirma la compra consultando a Mercado Pago', async () => {
    volverDeMercadoPago('payment_id=123&status=approved');
    mockApi.confirmarPagoMercadoPago.mockResolvedValue(resultado('CONFIRMADA'));
    const onFinalizar = vi.fn();
    render(<PantallaRetornoPago onFinalizar={onFinalizar} />);
    expect(screen.getByText('Confirmando tu pago')).toBeInTheDocument();
    await waitFor(() => expect(onFinalizar).toHaveBeenCalledWith(resultado('CONFIRMADA')));
    expect(mockApi.confirmarPagoMercadoPago).toHaveBeenCalledWith('123');
  });

  it('PU-42: con el pago rechazado muestra el resultado de la compra', async () => {
    volverDeMercadoPago('payment_id=123&status=rejected');
    mockApi.confirmarPagoMercadoPago.mockResolvedValue(resultado('RECHAZADA'));
    const onFinalizar = vi.fn();
    render(<PantallaRetornoPago onFinalizar={onFinalizar} />);
    await waitFor(() => expect(onFinalizar).toHaveBeenCalledWith(resultado('RECHAZADA')));
  });

  it('si se volvió sin pagar ofrece volver a intentar', async () => {
    volverDeMercadoPago('payment_id=null&status=null');
    mockApi.compra.mockResolvedValue(resultado('PENDIENTE_MERCADO_PAGO'));
    const onFinalizar = vi.fn();
    render(<PantallaRetornoPago onFinalizar={onFinalizar} />);
    expect(await screen.findByText('No completaste el pago')).toBeInTheDocument();
    expect(mockApi.compra).toHaveBeenCalledWith('000001');
    expect(mockApi.confirmarPagoMercadoPago).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Volver a intentar' }));
    expect(window.location.pathname).toBe('/');
    expect(onFinalizar).not.toHaveBeenCalled();
  });

  it('si el pago sigue en proceso permite consultar de nuevo', async () => {
    volverDeMercadoPago('payment_id=123&status=in_process');
    mockApi.confirmarPagoMercadoPago
      .mockResolvedValueOnce(
        resultado('PENDIENTE_MERCADO_PAGO', 'Mercado Pago todavía no acreditó el pago de esta compra'),
      )
      .mockResolvedValueOnce(resultado('CONFIRMADA'));
    const onFinalizar = vi.fn();
    render(<PantallaRetornoPago onFinalizar={onFinalizar} />);
    expect(await screen.findByText('Tu pago está en proceso')).toBeInTheDocument();
    expect(screen.getByText(/todavía no acreditó el pago/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Consultar de nuevo' }));
    await waitFor(() => expect(onFinalizar).toHaveBeenCalledWith(resultado('CONFIRMADA')));
  });

  it('muestra el error si no se puede confirmar el pago', async () => {
    volverDeMercadoPago('payment_id=123&status=approved');
    mockApi.confirmarPagoMercadoPago.mockRejectedValue(new Error('No se pudo conectar con Mercado Pago'));
    render(<PantallaRetornoPago onFinalizar={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con Mercado Pago');
    expect(screen.getByRole('button', { name: 'Consultar de nuevo' })).toBeInTheDocument();
  });
});
