import { describe, expect, it, vi } from 'vitest';
import { RelojArgentina } from '../../src/infraestructura/relojArgentina';

describe('RelojArgentina', () => {
  it('devuelve la fecha y la hora en la zona horaria del parque (UTC-3)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-16T02:15:00Z')); // 15/10 23:15 en Córdoba
    expect(new RelojArgentina().ahora()).toEqual({ fecha: '2026-10-15', hora: '23:15' });
    vi.useRealTimers();
  });
});
