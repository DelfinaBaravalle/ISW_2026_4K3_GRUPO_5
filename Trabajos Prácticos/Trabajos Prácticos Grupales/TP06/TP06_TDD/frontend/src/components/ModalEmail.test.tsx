import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ModalEmail } from './ModalEmail';

const email = {
  destinatario: 'visitante@ejemplo.com',
  asunto: 'Confirmación',
  cuerpo: 'Total: $15.000',
  enviadoEn: '',
};

describe('ModalEmail', () => {
  it('muestra a quién se envió el mail y su contenido', () => {
    render(<ModalEmail email={email} onCerrar={() => {}} />);
    expect(screen.getByRole('dialog')).toHaveTextContent('Mail enviado a visitante@ejemplo.com');
    expect(screen.getByText('Total: $15.000')).toBeInTheDocument();
  });

  it('se cierra con el botón o con Escape', async () => {
    const onCerrar = vi.fn();
    render(<ModalEmail email={email} onCerrar={onCerrar} />);
    await userEvent.click(screen.getByRole('button', { name: 'Entendido' }));
    await userEvent.keyboard('{Escape}');
    expect(onCerrar).toHaveBeenCalledTimes(2);
  });
});
