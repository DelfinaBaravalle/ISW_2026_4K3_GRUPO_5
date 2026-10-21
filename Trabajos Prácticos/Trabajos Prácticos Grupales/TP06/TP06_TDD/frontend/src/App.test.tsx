import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { guardarBorrador, recuperarBorrador } from './borradorGuardado';

vi.mock('./api', () => ({
  api: {
    sesion: vi.fn().mockResolvedValue({ id: 'u1', nombre: 'Camila', email: 'visitante@ejemplo.com' }),
    calendario: vi
      .fn()
      .mockResolvedValue({ hoy: '2026-10-15', fechaMaxima: '2026-11-15', horaLimiteMismoDia: '17:30', fechas: [] }),
    precios: vi.fn().mockResolvedValue({ preciosBase: { REGULAR: 10000, VIP: 20000 }, maximoEntradasPorFecha: 10 }),
  },
}));

describe('App', () => {
  it('si se entra a /resultado sin una compra, vuelve a la pantalla de compra', async () => {
    window.history.pushState({}, '', '/resultado');
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });

  it('al volver de Mercado Pago recupera el borrador de la compra una sola vez', async () => {
    const visitante = { edad: 30, tipoPase: 'REGULAR' } as const;
    guardarBorrador({ fecha: '', cantidad: 2, visitantes: [visitante, visitante], formaPago: 'TARJETA' });
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(await screen.findByLabelText('Cantidad de entradas')).toHaveValue(2);
    expect(recuperarBorrador()).toBeNull();
  });
});
