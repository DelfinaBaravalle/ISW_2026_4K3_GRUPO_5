import type { Usuario } from '../api';
import { Logo } from './Logo';

export function Encabezado({ usuario }: { usuario: Usuario | null }) {
  return (
    <header className="encabezado">
      <div className="encabezado__interior">
        <a href="/" className="marca" aria-label="EcoHarmony Park, inicio" translate="no">
          <Logo />
        </a>
        <span className="encabezado__seccion">Entradas al parque</span>
        {usuario && (
          <span className="encabezado__usuario" title={usuario.email}>
            <span className="avatar" aria-hidden="true">
              {usuario.nombre.charAt(0)}
            </span>
            <span className="encabezado__nombre">Hola, {usuario.nombre}</span>
          </span>
        )}
      </div>
    </header>
  );
}
