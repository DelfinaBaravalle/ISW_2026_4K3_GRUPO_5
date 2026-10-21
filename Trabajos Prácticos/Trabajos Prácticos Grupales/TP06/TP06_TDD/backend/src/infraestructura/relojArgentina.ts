import type { Reloj } from '../dominio/puertos';

const ZONA_HORARIA_PARQUE = 'America/Argentina/Cordoba';

export class RelojArgentina implements Reloj {
  ahora() {
    const partes = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: ZONA_HORARIA_PARQUE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(new Date())
        .map((p) => [p.type, p.value]),
    );
    return { fecha: `${partes.year}-${partes.month}-${partes.day}`, hora: `${partes.hour}:${partes.minute}` };
  }
}
