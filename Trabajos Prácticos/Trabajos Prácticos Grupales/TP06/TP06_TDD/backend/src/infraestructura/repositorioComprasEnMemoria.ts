import type { Compra } from '../dominio/compra';
import type { RepositorioCompras } from '../dominio/puertos';

export class RepositorioComprasEnMemoria implements RepositorioCompras {
  private readonly compras = new Map<string, Compra>();
  private ultimoId = 0;

  async guardar(datos: Omit<Compra, 'id'>): Promise<Compra> {
    this.ultimoId += 1;
    const compra = { ...datos, id: String(this.ultimoId).padStart(6, '0') };
    this.compras.set(compra.id, structuredClone(compra));
    return structuredClone(compra);
  }

  async actualizar(compra: Compra): Promise<void> {
    this.compras.set(compra.id, structuredClone(compra));
  }

  async buscarPorId(id: string): Promise<Compra | undefined> {
    const compra = this.compras.get(id);
    return compra && structuredClone(compra);
  }

  async listar(): Promise<Compra[]> {
    return [...this.compras.values()].map((c) => structuredClone(c));
  }
}
