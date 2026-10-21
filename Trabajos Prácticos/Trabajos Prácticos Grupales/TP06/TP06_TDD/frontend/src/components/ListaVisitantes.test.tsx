import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ajustarVisitantes, ListaVisitantes } from './ListaVisitantes';

const PRECIOS = { REGULAR: 10000, VIP: 20000 };

describe('ajustarVisitantes', () => {
  it('agrega visitantes vacíos cuando aumenta la cantidad', () => {
    expect(ajustarVisitantes([{ edad: 30, tipoPase: 'VIP' }], 3)).toEqual([
      { edad: 30, tipoPase: 'VIP' },
      { edad: '', tipoPase: '' },
      { edad: '', tipoPase: '' },
    ]);
  });

  it('quita los últimos visitantes cuando disminuye la cantidad', () => {
    const visitantes = [
      { edad: 30, tipoPase: 'VIP' as const },
      { edad: 8, tipoPase: 'REGULAR' as const },
    ];
    expect(ajustarVisitantes(visitantes, 1)).toEqual([{ edad: 30, tipoPase: 'VIP' }]);
  });
});

describe('ListaVisitantes', () => {
  it('muestra una fila por visitante', () => {
    render(
      <ListaVisitantes
        visitantes={[
          { edad: '', tipoPase: '' },
          { edad: '', tipoPase: '' },
        ]}
        preciosBase={PRECIOS}
        onCambiar={() => {}}
      />,
    );
    expect(screen.getByLabelText('Edad del visitante 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Edad del visitante 2')).toBeInTheDocument();
  });

  it('informa la edad ingresada', async () => {
    const onCambiar = vi.fn();
    render(<ListaVisitantes visitantes={[{ edad: '', tipoPase: '' }]} preciosBase={PRECIOS} onCambiar={onCambiar} />);
    await userEvent.type(screen.getByLabelText('Edad del visitante 1'), '7');
    expect(onCambiar).toHaveBeenLastCalledWith([{ edad: 7, tipoPase: '' }]);
  });

  it('informa el tipo de pase elegido', async () => {
    const onCambiar = vi.fn();
    render(<ListaVisitantes visitantes={[{ edad: 30, tipoPase: '' }]} preciosBase={PRECIOS} onCambiar={onCambiar} />);
    await userEvent.click(screen.getByRole('radio', { name: /VIP/ }));
    expect(onCambiar).toHaveBeenLastCalledWith([{ edad: 30, tipoPase: 'VIP' }]);
  });
});
