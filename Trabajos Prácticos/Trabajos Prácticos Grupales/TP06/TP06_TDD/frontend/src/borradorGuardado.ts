import type { BorradorCompra } from './components/PantallaCompra';

/**
 * Al ir al checkout de Mercado Pago la aplicación se descarga y pierde el borrador en memoria.
 * Se guarda en la sesión del navegador para poder reintentar el pago con los mismos datos al volver.
 */
const CLAVE = 'ecoharmony:borrador';

export function guardarBorrador(borrador: BorradorCompra) {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(borrador));
  } catch {
    // Sin almacenamiento disponible: al volver se empieza con el formulario vacío.
  }
}

export function recuperarBorrador(): BorradorCompra | null {
  try {
    const guardado = sessionStorage.getItem(CLAVE);
    return guardado ? JSON.parse(guardado) : null;
  } catch {
    return null;
  }
}

export function descartarBorradorGuardado() {
  try {
    sessionStorage.removeItem(CLAVE);
  } catch {
    // Nada que descartar.
  }
}
