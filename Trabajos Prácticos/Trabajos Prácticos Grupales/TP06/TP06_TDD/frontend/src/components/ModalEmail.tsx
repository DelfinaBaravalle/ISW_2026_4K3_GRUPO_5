import * as Dialog from '@radix-ui/react-dialog';
import type { EmailEnviado } from '../api';
import { Icono } from './Icono';

interface Props {
  email: EmailEnviado;
  onCerrar: () => void;
}

export function ModalEmail({ email, onCerrar }: Props) {
  return (
    <Dialog.Root
      open
      onOpenChange={(abierto) => {
        if (!abierto) onCerrar();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal__fondo" />
        <Dialog.Content
          className="modal"
          onCloseAutoFocus={(evento) => {
            evento.preventDefault();
            document.getElementById('ver-correo')?.focus();
          }}
        >
          <Dialog.Close className="boton-icono modal__cerrar" aria-label="Cerrar correo">
            <Icono nombre="cerrar" />
          </Dialog.Close>
          <Icono nombre="correo" className="modal__icono" />
          <Dialog.Title>Mail enviado a {email.destinatario}</Dialog.Title>
          <Dialog.Description className="texto-secundario">
            Esta es la copia del correo de confirmación de tu visita.
          </Dialog.Description>
          <div className="email">
            <div className="email__fila">
              <span>Para:</span> {email.destinatario}
            </div>
            <div className="email__fila">
              <span>Asunto:</span> {email.asunto}
            </div>
            <pre className="email__cuerpo">{email.cuerpo}</pre>
          </div>
          <Dialog.Close className="boton boton--primario boton--bloque">Entendido</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
