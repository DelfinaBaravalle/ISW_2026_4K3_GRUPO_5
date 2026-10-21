import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, type Compra, type ResultadoCompra } from '../api';
import { PantallaResultado } from './PantallaResultado';

vi.mock('../api', () => ({ api: { emails: vi.fn() } }));
const mockApi = vi.mocked(api);

const compraBase: Compra = {
  id: '000001',
  email: 'visitante@ejemplo.com',
  fechaVisita: '2026-10-17',
  cantidad: 2,
  detalle: [],
  total: 15000,
  formaPago: 'TARJETA',
  estado: 'CONFIRMADA',
  abonada: true,
  entradas: [
    { codigo: 'EHP-000001-1', edad: 30, tipoPase: 'REGULAR', precioBase: 10000, porcentajeDescuento: 0, precio: 10000 },
    { codigo: 'EHP-000001-2', edad: 10, tipoPase: 'REGULAR', precioBase: 10000, porcentajeDescuento: 50, precio: 5000 },
  ],
};

function resultado(cambios: Partial<Compra>, mensaje = 'Compraste 2 entradas para el 17/10/2026'): ResultadoCompra {
  return { compra: { ...compraBase, ...cambios }, mensaje };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockApi.emails.mockResolvedValue([
    {
      destinatario: 'visitante@ejemplo.com',
      asunto: 'Confirmación de compra - EcoHarmony Park',
      cuerpo: 'Orden: 000001',
      enviadoEn: '',
    },
  ]);
});

describe('PantallaResultado', () => {
  it('CP-48: informa la cantidad de entradas y la fecha de visita', async () => {
    render(<PantallaResultado resultado={resultado({})} onNuevaCompra={() => {}} />);
    expect(screen.getByText('Compraste 2 entradas para el 17/10/2026')).toBeInTheDocument();
    expect(screen.getByText('2 entradas')).toBeInTheDocument();
    expect(screen.getByText('Sábado 17 de octubre')).toBeInTheDocument();
    expect(screen.getByText('EHP-000001-1')).toBeInTheDocument();
    await screen.findByRole('button', { name: 'Ver mail enviado' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('CP-46: muestra el mail de confirmación enviado', async () => {
    render(<PantallaResultado resultado={resultado({})} onNuevaCompra={() => {}} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Ver mail enviado' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('Mail enviado a visitante@ejemplo.com');
  });

  it('CP-48 / CP-50: con efectivo informa que el pago está pendiente', async () => {
    render(
      <PantallaResultado
        resultado={resultado({ estado: 'PENDIENTE_PAGO_BOLETERIA', abonada: false, formaPago: 'EFECTIVO' })}
        onNuevaCompra={() => {}}
      />,
    );
    expect(screen.getByText('Pendiente en boletería')).toBeInTheDocument();
    await screen.findByRole('button', { name: 'Ver mail enviado' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('CP-42 / CP-47: con el pago rechazado no muestra entradas ni mail', () => {
    render(
      <PantallaResultado
        resultado={resultado({ estado: 'RECHAZADA', abonada: false, entradas: [] }, 'El pago no pudo realizarse')}
        onNuevaCompra={() => {}}
      />,
    );
    expect(screen.getByText('No pudimos procesar tu pago')).toBeInTheDocument();
    expect(screen.queryByText('Tus entradas')).not.toBeInTheDocument();
    expect(mockApi.emails).not.toHaveBeenCalled();
  });

  it('permite volver a ver el mail y empezar una nueva compra', async () => {
    const onNuevaCompra = vi.fn();
    render(<PantallaResultado resultado={resultado({})} onNuevaCompra={onNuevaCompra} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Ver mail enviado' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Entendido' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver mail enviado' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Entendido' }));
    await userEvent.click(screen.getByRole('button', { name: 'Comprar más entradas' }));
    expect(onNuevaCompra).toHaveBeenCalled();
  });

  it('muestra el mail que corresponde a esta compra, no el último de la bandeja', async () => {
    mockApi.emails.mockResolvedValue([
      { destinatario: 'visitante@ejemplo.com', asunto: 'Mail de esta compra', cuerpo: 'Orden: 000001', enviadoEn: '' },
      { destinatario: 'visitante@ejemplo.com', asunto: 'Mail de otra compra', cuerpo: 'Orden: 000002', enviadoEn: '' },
    ]);
    render(<PantallaResultado resultado={resultado({})} onNuevaCompra={() => {}} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Ver mail enviado' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('Mail de esta compra');
  });

  it('usa el singular para un visitante de 1 año', async () => {
    const entradas = [{ ...compraBase.entradas[0], edad: 1, precio: 0 }];
    render(<PantallaResultado resultado={resultado({ cantidad: 1, entradas })} onNuevaCompra={() => {}} />);
    expect(screen.getByText(/Regular · 1 año ·/)).toBeInTheDocument();
    expect(screen.getByText('1 entrada')).toBeInTheDocument();
    await screen.findByRole('button', { name: 'Ver mail enviado' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('si no se puede cargar el mail, la pantalla sigue funcionando', async () => {
    mockApi.emails.mockRejectedValue(new Error('sin conexión'));
    render(<PantallaResultado resultado={resultado({})} onNuevaCompra={() => {}} />);
    expect(await screen.findByText('¡Compra confirmada!')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
