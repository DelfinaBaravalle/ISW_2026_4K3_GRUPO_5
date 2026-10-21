export type TipoError = 'VALIDACION' | 'NO_AUTENTICADO' | 'NO_ENCONTRADO' | 'PASARELA';

export class ErrorCompra extends Error {
  constructor(
    mensaje: string,
    readonly tipo: TipoError = 'VALIDACION',
  ) {
    super(mensaje);
    this.name = 'ErrorCompra';
  }
}
