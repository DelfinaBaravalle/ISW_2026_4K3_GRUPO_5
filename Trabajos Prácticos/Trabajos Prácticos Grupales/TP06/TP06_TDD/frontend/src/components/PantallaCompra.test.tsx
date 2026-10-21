import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import { recuperarBorrador } from '../borradorGuardado';
import { irAUrlExterna } from '../navegacion';
import { PantallaCompra } from './PantallaCompra';

vi.mock('../api', () => ({
  api: {
    calendario: vi.fn(),
    precios: vi.fn(),
    cotizar: vi.fn(),
    comprar: vi.fn(),
  },
}));
vi.mock('../navegacion', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../navegacion')>()),
  irAUrlExterna: vi.fn(),
}));

const mockApi = vi.mocked(api);
const USUARIO = { id: 'u1', nombre: 'Camila', email: 'visitante@ejemplo.com' };

beforeEach(() => {
  vi.clearAllMocks();
  window.history.pushState({}, '', '/');
  mockApi.calendario.mockResolvedValue({
    hoy: '2026-10-15',
    fechaMaxima: '2026-11-15',
    horaLimiteMismoDia: '17:30',
    fechas: [
      { fecha: '2026-10-17', abierto: true, disponible: true },
      { fecha: '2026-10-19', abierto: false, disponible: false },
    ],
  });
  mockApi.precios.mockResolvedValue({ preciosBase: { REGULAR: 11000, VIP: 22000 }, maximoEntradasPorFecha: 10 });
  mockApi.cotizar.mockResolvedValue({
    entradas: [{ edad: 30, tipoPase: 'REGULAR', precioBase: 11000, porcentajeDescuento: 0, precio: 11000 }],
    total: 11000,
  });
});

async function completarFormulario(formaPago: 'Tarjeta' | 'Efectivo') {
  await userEvent.click(await screen.findByRole('button', { name: /17 de octubre/ }));
  await userEvent.type(screen.getByLabelText('Edad del visitante 1'), '30');
  await userEvent.click(screen.getByRole('radio', { name: /Regular/ }));
  await userEvent.click(screen.getByRole('radio', { name: new RegExp(formaPago) }));
}

describe('PantallaCompra', () => {
  it('no muestra el aviso de sesión mientras se está cargando el usuario', async () => {
    render(<PantallaCompra usuario={undefined} onFinalizar={() => {}} />);
    await screen.findByText('Comprar entradas');
    expect(screen.queryByText(/Debés iniciar sesión/)).not.toBeInTheDocument();
  });

  it('PU-37: avisa que hay que iniciar sesión si no hay usuario', async () => {
    render(<PantallaCompra usuario={null} onFinalizar={() => {}} />);
    expect(await screen.findByText(/Debés iniciar sesión/)).toBeInTheDocument();
  });

  it('muestra los precios de los pases que informa el backend', async () => {
    render(<PantallaCompra usuario={USUARIO} onFinalizar={() => {}} />);
    expect(await screen.findByText('$11.000')).toBeInTheDocument();
    expect(screen.getByText('$22.000')).toBeInTheDocument();
  });

  it('PU-35: muestra el total calculado por el backend', async () => {
    render(<PantallaCompra usuario={USUARIO} onFinalizar={() => {}} />);
    await completarFormulario('Efectivo');
    await waitFor(() => expect(screen.getByText('Total')).toBeInTheDocument());
    expect(mockApi.cotizar).toHaveBeenLastCalledWith(
      expect.objectContaining({
        fechaVisita: '2026-10-17',
        cantidad: 1,
        visitantes: [{ edad: 30, tipoPase: 'REGULAR' }],
      }),
    );
  });

  it('PU-39: muestra el error que devuelve el backend al confirmar', async () => {
    mockApi.comprar.mockRejectedValue(new Error('Se debe seleccionar una forma de pago: tarjeta o efectivo'));
    render(<PantallaCompra usuario={USUARIO} onFinalizar={() => {}} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar compra' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Se debe seleccionar una forma de pago');
  });

  it('PU-40: con tarjeta redirige a Mercado Pago', async () => {
    mockApi.comprar.mockResolvedValue({
      compra: { id: '000001' } as never,
      mensaje: '',
      urlPago: '/mercado-pago/000001',
    });
    const onFinalizar = vi.fn();
    render(<PantallaCompra usuario={USUARIO} onFinalizar={onFinalizar} />);
    await completarFormulario('Tarjeta');
    await userEvent.click(screen.getByRole('button', { name: 'Ir a pagar con Mercado Pago' }));
    await waitFor(() => expect(window.location.pathname).toBe('/mercado-pago/000001'));
    expect(onFinalizar).not.toHaveBeenCalled();
  });

  it('PU-40: con Mercado Pago real sale al checkout y guarda el borrador para reintentar al volver', async () => {
    const checkout = 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=1';
    mockApi.comprar.mockResolvedValue({ compra: { id: '000001' } as never, mensaje: '', urlPago: checkout });
    const onFinalizar = vi.fn();
    render(<PantallaCompra usuario={USUARIO} onFinalizar={onFinalizar} />);
    await completarFormulario('Tarjeta');
    await userEvent.click(screen.getByRole('button', { name: 'Ir a pagar con Mercado Pago' }));
    await waitFor(() => expect(irAUrlExterna).toHaveBeenCalledWith(checkout));
    expect(recuperarBorrador()).toMatchObject({ fecha: '2026-10-17', cantidad: 1, formaPago: 'TARJETA' });
    expect(onFinalizar).not.toHaveBeenCalled();
  });

  it('PU-44: con efectivo finaliza sin pasar por Mercado Pago', async () => {
    const resultado = { compra: { id: '000002' } as never, mensaje: 'Registraste 1 entrada' };
    mockApi.comprar.mockResolvedValue(resultado);
    const onFinalizar = vi.fn();
    render(<PantallaCompra usuario={USUARIO} onFinalizar={onFinalizar} />);
    await completarFormulario('Efectivo');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar compra' }));
    await waitFor(() => expect(onFinalizar).toHaveBeenCalledWith(resultado));
    expect(window.location.pathname).toBe('/');
  });

  it('PU-07: marca en rojo el aviso si se escriben más de 10 entradas', async () => {
    render(<PantallaCompra usuario={USUARIO} onFinalizar={() => {}} />);
    const cantidad = await screen.findByLabelText('Cantidad de entradas');
    await userEvent.clear(cantidad);
    await userEvent.type(cantidad, '11');
    expect(screen.getByText(/Máximo 10 entradas por fecha/)).toHaveClass('ayuda--error');
  });

  it('el botón de quitar reduce las filas de visitantes', async () => {
    render(<PantallaCompra usuario={USUARIO} onFinalizar={() => {}} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar una entrada' }));
    expect(screen.getByLabelText('Edad del visitante 2')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar una entrada' }));
    expect(screen.queryByLabelText('Edad del visitante 2')).not.toBeInTheDocument();
  });

  it('agrega una fila de visitante por cada entrada y no permite pasar de 10 con el botón', async () => {
    render(<PantallaCompra usuario={USUARIO} onFinalizar={() => {}} />);
    const agregar = await screen.findByRole('button', { name: 'Agregar una entrada' });
    for (let i = 0; i < 9; i++) await userEvent.click(agregar);
    expect(screen.getByLabelText('Edad del visitante 10')).toBeInTheDocument();
    expect(agregar).toBeDisabled();
  });
  it('restaura los datos si se reduce la cantidad y se vuelve a ampliar', async () => {
    render(<PantallaCompra usuario={USUARIO} onFinalizar={() => {}} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar una entrada' }));
    await userEvent.type(screen.getByLabelText('Edad del visitante 2'), '12');
    await userEvent.click(screen.getAllByRole('radio', { name: /VIP/ })[1]);
    await userEvent.click(screen.getByRole('button', { name: 'Quitar una entrada' }));
    expect(screen.queryByLabelText('Edad del visitante 2')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Agregar una entrada' }));
    expect(screen.getByLabelText('Edad del visitante 2')).toHaveValue(12);
    expect(screen.getAllByRole('radio', { name: /VIP/ })[1]).toBeChecked();
  });

  it('permite revisar un borrador conservando fecha, visitantes y forma de pago', async () => {
    render(
      <PantallaCompra
        usuario={USUARIO}
        onFinalizar={() => {}}
        borrador={{
          fecha: '2026-10-17',
          cantidad: 1,
          visitantes: [{ edad: 30, tipoPase: 'VIP' }],
          formaPago: 'TARJETA',
        }}
      />,
    );
    expect(await screen.findByLabelText('Edad del visitante 1')).toHaveValue(30);
    expect(screen.getByRole('radio', { name: /VIP/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Tarjeta/ })).toBeChecked();
    expect(screen.getByRole('button', { name: /17 de octubre/ })).toHaveAttribute('aria-pressed', 'true');
  });
});
