# Auditoría y rediseño UX/UI — EcoHarmony Park

Fecha: 19 de octubre de 2026. Alcance: frontend completo de la US Comprar entradas. Trabajo local, sin commit ni publicación.

## Procedencia y método

La evaluación UX A se realizó de forma independiente por un subagente, sobre código, capturas y Chrome. La evaluación UI B independiente se interrumpió por límite de uso; el agente principal completó la auditoría técnica. **La auditoría conjunta no tuvo dos evaluaciones independientes completas.**

Skills instaladas fuera del repositorio, en el perfil de Codex:
- [Impeccable](https://github.com/pbakaus/impeccable): crítica UX, criterios de composición y detector de implementación.
- [Web Design Guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines): controles, semántica, foco, estados y responsive.

Se leyeron la consigna del TP6 y el FAQ del PO. El usuario autorizó reorganizar toda la UX/UI manteniendo backend, validaciones, requisitos, Lato, paleta y logo.

Questions skipped: el usuario indicó continuar con libertad de cambios; no había una decisión de producto pendiente.

## Hallazgos anteriores y acciones

| Prioridad | Hallazgo | Cambio |
| --- | --- | --- |
| P1 | Total y compra lejos de los datos en móvil. | Barra inferior con importe y acceso al resumen; se oculta cuando el resumen entra en pantalla. |
| P1 | Precio base y descuento aplicado separados. | Importe aplicado junto a cada visitante, obtenido de la cotización del backend. Texto explica precios base y alcance de los pases. |
| P1 | Cotización en curso indistinguible de formulario incompleto. | Estado “Calculando tu total…” y eliminación de importes anteriores cuando cambia la solicitud. |
| P1 | Error visible solo al final, sin foco. | Foco sobre el mensaje original del servidor y enlaces a fecha, visitantes y pago. No se agregaron validaciones paralelas que bloqueen el envío. |
| P1 | Modal de correo sin contención ni retorno de foco. | Radix Dialog, Escape, navegación de teclado contenida, fondo inactivo y retorno al botón de apertura. |
| P1 | El correo tapa espontáneamente la confirmación. | Confirmación visible primero; el usuario abre el correo con una acción explícita. El envío sigue siendo responsabilidad del backend. |
| P2 | Reintentar después del rechazo descarta la visita. | Borrador en memoria de React conservado durante la navegación al pago y el retorno. Una nueva compra exitosa empieza limpia. |
| P2 | Reducir y ampliar cantidad borra filas ya completadas. | Reserva de filas en memoria durante la edición. Solo se envían los visitantes de la cantidad actual. |
| P2 | Exceso de contenedores, decoración y tipografía pequeña. | Tres secciones en una superficie, visitantes en filas, escala legible y controles consistentes. |
| P2 | Pago desplazado en anchos intermedios. | Contenedor centrado con márgenes automáticos y cabecera a todo el ancho. |
| P2 | Números e íconos poco uniformes. | Cifras tabulares e íconos de Lucide con un único grosor. |

### Referencias de código

- `frontend/src/components/PantallaCompra.tsx`: flujo, estados de cotización, error y resumen.
- `frontend/src/components/ListaVisitantes.tsx`: filas y cotización aplicada por visitante.
- `frontend/src/components/BarraResumen.tsx`: resumen móvil y observación de visibilidad.
- `frontend/src/components/ModalEmail.tsx`: diálogo accesible con Radix.
- `frontend/src/App.tsx`: borrador de reintento y enlace para saltar al contenido.
- `frontend/src/components/Calendario.tsx`: botones e interacción mediante flechas de teclado.
- `frontend/src/estilos.css`: tokens, medidas, responsive, foco y estados.

## Librerías incorporadas

- `@radix-ui/react-dialog`: gestión del diálogo, foco y teclado.
- `lucide-react`: íconos SVG importados individualmente.
- `@axe-core/playwright` (desarrollo): auditoría automática en navegador. No forma parte del bundle de producción.

## Verificación

- Compilación y ESLint correctos.
- 44 pruebas unitarias del frontend aprobadas. Se mantuvo la cobertura de los escenarios originales; las pruebas del resultado se adaptaron a la apertura explícita del correo. Se agregaron casos para restauración de visitantes y borrador.
- 57 combinaciones de estado/ancho: compra, diez visitantes, cantidad inválida, resultado pendiente, aprobado/rechazado, correo y pago simulado.
- Anchos: 320, 390, 500, 600, 768, 1000, 1024, 1280 y 1440 px; sin desbordamiento horizontal en los estados comprobados. Tarjetas equivalentes y controles comparados mediante geometría del navegador.
- Axe: sin infracciones automáticas en las pantallas examinadas con etiquetas WCAG 2 A/AA, 2.1 AA y 2.2 AA. Esto no sustituye una auditoría manual completa ni constituye certificación.
- Revisión visual final del evaluador A: SHIP para los cinco problemas inicialmente señalados. La navegación desde errores se agregó como ajuste final.
- Detector Impeccable: único aviso sobre uso de Lato. Se conserva por ser requisito explícito del FAQ; el aviso estético no justifica cambiar la tipografía.
- Verificación de foco del modal, Escape, retorno al disparador y altura en 320 × 568 px.
- Reintento tarjeta rechazada → formulario → efectivo comprobado con APIs interceptadas. No se crearon compras en el servidor durante las pruebas de navegador.
- Backend comparado con hashes anteriores al rediseño. No se editaron sus archivos ni los contratos API.

## Límites y decisiones conservadas

- El borrador vive en memoria: una recarga completa lo pierde. No se prometió persistencia entre recargas y no se implementó almacenamiento de datos personales.
- El resultado sigue dependiendo de la compra de la sesión SPA. Recargar `/resultado` vuelve al inicio, comportamiento existente.
- El importe aplicado por visitante aparece cuando la API devuelve la cotización completa; no se replicaron descuentos ni cálculos de negocio en el frontend.
- Las celdas de calendario tienen 44 px de alto. En 320 px su ancho es menor de 44 px para conservar siete columnas; superan el mínimo de 24 px y mantienen separación.
- Se probó Chrome con emulación de tamaños y teclado; no dispositivos físicos ni lectores de pantalla reales.

Sistema documentado en `frontend/PRODUCT.md`, `frontend/DESIGN.md` y `frontend/.impeccable/design.json`.
