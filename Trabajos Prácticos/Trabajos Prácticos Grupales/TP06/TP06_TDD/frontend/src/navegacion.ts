import { useEffect, useState } from 'react';

/** Navegación mínima basada en la URL (sin librería de ruteo). */
export function navegar(ruta: string, { reemplazar = false } = {}) {
  if (reemplazar) window.history.replaceState({}, '', ruta);
  else window.history.pushState({}, '', ruta);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0 });
}

export function esUrlExterna(url: string) {
  return /^https?:\/\//.test(url);
}

/** Sale de la aplicación, por ejemplo hacia el checkout de Mercado Pago. */
export function irAUrlExterna(url: string) {
  window.location.assign(url);
}

export function useRuta() {
  const [ruta, setRuta] = useState(window.location.pathname);
  useEffect(() => {
    const actualizar = () => setRuta(window.location.pathname);
    window.addEventListener('popstate', actualizar);
    return () => window.removeEventListener('popstate', actualizar);
  }, []);
  return ruta;
}
