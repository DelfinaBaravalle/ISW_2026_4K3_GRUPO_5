import {
  ArrowRight,
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Info,
  Leaf,
  LoaderCircle,
  Mail,
  Minus,
  Plus,
  Ticket,
  UserRound,
  X,
} from 'lucide-react';

const ICONOS = {
  calendario: CalendarDays,
  reloj: Clock3,
  entrada: Ticket,
  persona: UserRound,
  tarjeta: CreditCard,
  efectivo: Banknote,
  flecha: ArrowRight,
  hoja: Leaf,
  check: Check,
  confirmado: CheckCircle2,
  correo: Mail,
  cerrar: X,
  info: Info,
  cargando: LoaderCircle,
  anterior: ChevronLeft,
  siguiente: ChevronRight,
  menos: Minus,
  mas: Plus,
};

export function Icono({ nombre, className = '' }: { nombre: keyof typeof ICONOS; className?: string }) {
  const Componente = ICONOS[nombre];
  return (
    <Componente className={`icono ${className}`} size={20} strokeWidth={1.75} aria-hidden="true" focusable="false" />
  );
}
