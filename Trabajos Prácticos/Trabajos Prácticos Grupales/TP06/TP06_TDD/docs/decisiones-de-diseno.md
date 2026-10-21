# TP6 – TDD · Decisiones de diseño

**EcoHarmony Park – US "Comprar entradas"** · Ingeniería y Calidad de Software 2026 · 4K3 · Grupo 5

---

## 1. Alcance

Se implementó la User Story **Comprar entradas** (grupos impares), siguiendo los criterios de aceptación refinados y el Test List CP-01 a CP-50, más las aclaraciones del FAQ del PO.

La entrega incluye:

| Salida pedida                     | Dónde está                                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Implementación funcional de la US | `backend/` (API) + `frontend/` (app web responsive)                                                              |
| Pruebas automatizadas             | `backend/test/` (101 tests, 100% de líneas cubiertas) + `frontend/src/**/*.test.ts(x)` (42 tests, 93% de líneas) |
| Documento de decisiones de diseño | Este archivo                                                                                                     |

## 2. Tecnologías

| Capa     | Tecnología                                 | Motivo                                                                                                                                                                      |
| -------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lenguaje | **TypeScript 6.0** (front y back)          | Un solo lenguaje en toda la solución; el tipado estático detecta errores antes de ejecutar y hace explícito el modelo de dominio (`TipoPase`, `FormaPago`, `EstadoCompra`). |
| Backend  | Node.js + **Express 5**                    | API HTTP simple y liviana. Express 5 propaga solo los errores de los handlers `async` al middleware de errores.                                                             |
| Frontend | **React 19 + Vite**                        | Componentes reutilizables y testeables, y un servidor de desarrollo rápido con proxy a la API.                                                                              |
| Testing  | **Vitest** (+ Supertest y Testing Library) | API compatible con Jest, soporte nativo de TypeScript sin configuración extra y modo _watch_ ideal para el ciclo Red-Green-Refactor.                                        |
| Estilo   | **ESLint** + **Prettier**                  | Verifican de forma automática las reglas de estilo de código (ver sección 7).                                                                                               |

> El FAQ (punto 24) pide una app mobile y acepta una **web responsive**. La interfaz se diseñó _mobile-first_ (375 px) y se adapta a escritorio.

## 3. Arquitectura

Se separó el **dominio** (reglas de negocio puras) de la **infraestructura** (HTTP, mail, Mercado Pago, reloj, persistencia). Es un enfoque de _puertos y adaptadores_:

```
backend/src
├── dominio/                 ← reglas de negocio, sin dependencias externas
│   ├── reglasFecha.ts       CP-11..21  apertura del parque, hoy hasta 17:30, máx. 1 mes
│   ├── reglasEntradas.ts    CP-01..07, 22..25  cantidad, edades, tipo de pase
│   ├── precios.ts           CP-26..35  precio base y descuentos por edad
│   ├── compraEntradas.ts    CP-06..10, 36..50  caso de uso (orquesta todo)
│   ├── puertos.ts           interfaces: RepositorioCompras, PasarelaPago, ServicioEmail, Reloj
│   ├── fechas.ts / formato.ts / tipos.ts / errores.ts / compra.ts
├── infraestructura/         ← implementaciones concretas de los puertos
│   ├── repositorioComprasEnMemoria.ts
│   ├── mercadoPagoSimulado.ts
│   ├── emailSimulado.ts
│   ├── relojArgentina.ts
│   └── sesionesSimuladas.ts
├── api/app.ts               ← adaptador HTTP (Express)
└── server.ts
```

**Por qué así:**

- **Testeabilidad.** El caso de uso `CompraEntradasService` recibe sus dependencias por constructor (inyección de dependencias). En los tests se reemplazan por dobles (`RelojFijo`, `EmailFalso`, `PasarelaFalsa`). Así podemos probar "son las 17:31" o "Mercado Pago rechazó el pago" sin depender de la hora real ni de servicios externos.
- **El reloj es un puerto.** Las reglas "hoy hasta las 17:30" y "máximo 1 mes" dependen del momento actual. Si el código llamara a `new Date()` directamente, los tests CP-12 a CP-18 no serían deterministas.
- **Fechas como texto `AAAA-MM-DD`.** Una fecha de visita es un día del calendario, no un instante. Usar `Date` con hora introduce errores por zona horaria (por ejemplo, que el 17/10 "se convierta" en 16/10). Los cálculos se hacen en UTC sobre el texto ISO, y la hora "actual" se obtiene en la zona `America/Argentina/Cordoba`.
- **Una única fuente de verdad.** El precio, los días habilitados y todas las validaciones se calculan en el backend. El front consume `/api/calendario` para deshabilitar días y `/api/compras/cotizacion` para mostrar el total, así no se duplican las reglas.
- **Errores de dominio tipados.** `ErrorCompra` tiene un `tipo` (`VALIDACION`, `NO_AUTENTICADO`, `NO_ENCONTRADO`) que la API traduce a 400/401/404. El dominio no conoce HTTP.

### Endpoints

| Método | Ruta                              | Uso                                                                                   |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------- |
| GET    | `/api/sesion`                     | Usuario logueado (sesión simulada)                                                    |
| GET    | `/api/calendario`                 | Fechas desde hoy hasta +1 mes, indicando cuáles están disponibles                     |
| GET    | `/api/precios`                    | Precios base y descuentos                                                             |
| POST   | `/api/compras/cotizacion`         | Valida y calcula el detalle y el total, sin registrar nada                            |
| POST   | `/api/compras`                    | Inicia la compra (tarjeta → URL de Mercado Pago; efectivo → registra y envía el mail) |
| GET    | `/api/mercado-pago/:id`           | Datos para la pantalla de Mercado Pago simulada                                       |
| POST   | `/api/mercado-pago/:id/resultado` | Resultado del pago `{ aprobado }` (simula el _webhook_ de Mercado Pago)               |
| GET    | `/api/emails`                     | Bandeja de mails simulados del usuario (para el modal)                                |

### Estados de una compra

```
             tarjeta                    aprobado
 [inicio] ──────────► PENDIENTE_MERCADO_PAGO ─────────► CONFIRMADA (abonada, entradas + mail)
    │                          │
    │ efectivo                 └── rechazado ─────────► RECHAZADA (sin entradas ni mail)
    ▼
 PENDIENTE_PAGO_BOLETERIA (no abonada, mail "pago pendiente")
```

## 4. Aplicación del ciclo TDD (Red → Green → Refactor)

El Test List del documento del grupo se usó como _backlog_ de pruebas. Se avanzó desde las validaciones más simples hacia el cálculo de precios y, por último, los flujos completos. En cada ciclo se escribió primero la prueba, se ejecutó y se verificó que fallara (**Red**), se escribió el código mínimo para que pase (**Green**) y después se mejoró el diseño volviendo a correr toda la suite (**Refactor**).

| Ciclo                             | Pruebas (Red)                                                                                                                                                   | Implementación (Green)                                                                                                                                             | Refactor                                                                                                                                                                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Fecha de visita                | `reglasFecha.test.ts`: 17 tests (CP-11 a CP-21, más formato inválido y meses cortos). Fallaban porque el módulo no existía.                                     | `parqueAbierto` y `validarFechaVisita` en un solo bloque, con cálculos de `Date` en línea.                                                                         | Se extrajeron `fechas.ts` (`aFechaUTC`, `sumarUnMes`, `esFechaISOValida`) y las constantes `HORA_LIMITE_COMPRA_MISMO_DIA`, `FERIADOS_CERRADO` y `LUNES`. Siguió en 17/17.                                                                |
| 2. Cantidad, edades y precios     | `reglasEntradas.test.ts` (CP-01 a 07, 22 a 25) y `precios.test.ts` (CP-26 a 35).                                                                                | `validarCantidad`, `validarVisitantes`, `calcularPrecioEntrada` y `calcularDetallePrecios`. Precios en `PRECIOS_BASE` y descuento en `porcentajeDescuentoPorEdad`. | Tipos compartidos en `tipos.ts` (`TIPOS_PASE` como única lista de pases válidos). 41/41.                                                                                                                                                 |
| 3. Caso de uso de compra          | `compraEntradas.test.ts`: 25 tests con dobles de prueba (CP-06, 08 a 10, 36 a 50).                                                                              | `CompraEntradasService` con `cotizar`, `iniciarCompra` y `registrarResultadoPago`, y `RepositorioComprasEnMemoria`.                                                | Se movió el formateo de fecha y pesos a `formato.ts`. Chequeo de tipos con `tsc`. 66/66.                                                                                                                                                 |
| 4. API HTTP                       | `app.test.ts`: 15 tests con Supertest (sesión, calendario, cotización, CP-37, 38, 40, 42, 49 y 50).                                                             | `crearApp` con Express y adaptadores simulados de Mercado Pago, mail, reloj y sesión.                                                                              | El código HTTP se elegía buscando texto en el mensaje de error. Se reemplazó por `ErrorCompra.tipo` y una tabla `STATUS_POR_TIPO_ERROR`. 81/81.                                                                                          |
| 5. Front: calendario y visitantes | `Calendario.test.tsx` y `ListaVisitantes.test.tsx`: 11 tests (días cerrados deshabilitados según el FAQ 2, rango de compra, selección, una fila por visitante). | Componentes `Calendario` y `ListaVisitantes` + `ajustarVisitantes`.                                                                                                | Se agregó la limpieza del DOM entre tests en `setupTests.ts`. 11/11.                                                                                                                                                                     |
| 6. Revisión y corrección de bugs  | Se escribió un test que reproducía cada bug encontrado (ver sección 5) y se verificó que fallara: 7 en el back y 4 en el front.                                 | Se corrigió cada bug.                                                                                                                                              | Los precios y el máximo de entradas que el front tenía escritos a mano pasaron a leerse de `/api/precios`. Se eliminó código sin uso. Back 94/94, front 40/40.                                                                           |
| 7. Revisión final                 | Tests que reproducían 5 problemas más (sección 5): 5 en el back y 2 en el front.                                                                                | Se corrigió cada uno.                                                                                                                                              | ESLint detectó un `setState` dentro de un efecto en la cotización en vivo. Se reescribió para que la cotización mostrada se derive de los datos actuales del formulario. Se aplicó Prettier a todo el código. Back 101/101, front 42/42. |

### Trazabilidad Test List → pruebas automatizadas

| Casos de prueba                                     | Archivo de test                                                                   |
| --------------------------------------------------- | --------------------------------------------------------------------------------- |
| CP-01 a CP-07 (cantidad)                            | `backend/test/dominio/reglasEntradas.test.ts`                                     |
| CP-06, CP-08 a CP-10 (límite acumulado por fecha)   | `backend/test/dominio/compraEntradas.test.ts`                                     |
| CP-11 a CP-21 (fecha)                               | `backend/test/dominio/reglasFecha.test.ts` (+ `frontend/.../Calendario.test.tsx`) |
| CP-22 a CP-25 (edad y tipo de pase)                 | `backend/test/dominio/reglasEntradas.test.ts`                                     |
| CP-26 a CP-35 (precios y descuentos)                | `backend/test/dominio/precios.test.ts`                                            |
| CP-36 a CP-38 (usuario y correo)                    | `compraEntradas.test.ts` + `backend/test/api/app.test.ts`                         |
| CP-39 a CP-42 (forma de pago y Mercado Pago)        | `compraEntradas.test.ts` + `app.test.ts`                                          |
| CP-43 a CP-45 (efectivo)                            | `compraEntradas.test.ts`                                                          |
| CP-46 a CP-50 (confirmación y flujos completos)     | `compraEntradas.test.ts` + `app.test.ts` + `PantallaResultado.test.tsx`           |
| CP-07, 35, 37, 39, 40, 44 (vista desde la interfaz) | `frontend/src/components/PantallaCompra.test.tsx`                                 |
| CP-41, 42 (pantalla de Mercado Pago)                | `frontend/src/components/PantallaMercadoPago.test.tsx`                            |
| Criterio 10 (sin cupo diario del parque)            | `compraEntradas.test.ts`                                                          |

Cada test lleva en su nombre el código CP correspondiente, por ejemplo `it('CP-14: falla si se compra para hoy después de las 17:30')`. Los 50 CP del Test List y los 31 criterios refinados tienen al menos un test automatizado.

### Cobertura

Se mide con `npm run coverage` en cada carpeta. El reporte HTML queda en `coverage/index.html`.

|                                          | Líneas | Ramas |
| ---------------------------------------- | ------ | ----- |
| Backend (`src/`, sin contar `server.ts`) | 100%   | 99%   |
| Frontend (`src/`, sin contar `main.tsx`) | 93%    | 90%   |

En el front, lo que queda sin cubrir es sobre todo el ruteo de `App.tsx` entre pantallas, que se verificó a mano en el navegador.

### Bugs encontrados en la revisión

Para cada uno se escribió primero un test que lo reproducía (Red) y después la corrección (Green).

| #   | Bug                                                                                                                                                | Corrección                                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Una solicitud **sin cuerpo** respondía 500 (error interno).                                                                                        | El caso de uso trata una solicitud vacía como datos faltantes y responde 400: "La fecha de visita es obligatoria". |
| 2   | Un visitante `null`, o `visitantes` que no fuera una lista, respondía 500.                                                                         | `validarVisitantes` controla con `Array.isArray` y tolera elementos vacíos.                                        |
| 3   | Un **JSON mal formado** respondía 500.                                                                                                             | El middleware de errores responde 400: "La solicitud no tiene un formato válido".                                  |
| 4   | Si Mercado Pago enviaba `aprobado: "true"` (texto), **la compra se rechazaba** sin avisar.                                                         | Se exige un booleano. Si no lo es, se responde 400 y la compra sigue pendiente.                                    |
| 5   | Se aceptaban edades absurdas (500 años).                                                                                                           | Edad máxima de 120, la misma que ya limitaba el campo del front.                                                   |
| 6   | Al abrir la app aparecía un instante el aviso "Debés iniciar sesión".                                                                              | Se distingue "cargando" (`undefined`) de "sin sesión" (`null`).                                                    |
| 7   | Si fallaba la lectura del mail, quedaba una promesa sin manejar.                                                                                   | Se agregó el `catch`. La pantalla de resultado se sigue mostrando.                                                 |
| 8   | Al recargar en `/resultado` se veía el formulario, pero la URL quedaba mal.                                                                        | Se redirige a `/`.                                                                                                 |
| 9   | Los precios y el máximo de 10 estaban **duplicados** en el front.                                                                                  | El front los obtiene de `/api/precios`: el backend es la única fuente de verdad.                                   |
| 10  | Los tokens `toString`, `constructor` o `__proto__` se aceptaban como sesión válida, porque son propiedades heredadas de los objetos de JavaScript. | Se busca la sesión con `Object.hasOwn`.                                                                            |
| 11  | Una fecha enviada como lista (`["2026-10-17"]`) pasaba la validación de formato y después rompía el servidor (500).                                | Se exige que la fecha sea un texto.                                                                                |
| 12  | Si Mercado Pago aprobaba el pago **después** de la fecha de visita, la compra se confirmaba para un día ya pasado.                                 | Al aprobar se controla que la fecha no haya pasado. Si pasó, la compra se rechaza.                                 |
| 13  | Plurales incorrectos: "Ya tenés 1 entradas", "1 años".                                                                                             | Función `pluralizar` en el back y en el front.                                                                     |
| 14  | La pantalla de resultado mostraba el último mail de la bandeja, que podía ser de otra compra.                                                      | Se muestra el mail cuya orden coincide con la compra.                                                              |

## 5. Supuestos e interpretaciones

| Tema                       | Decisión                                                                                                                                                                                                                       | Fundamento                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Registro y login           | Sesión **simulada** con tokens fijos (`sesion-demo` y `sesion-mail-invalido`).                                                                                                                                                 | FAQ 19: "pueden comenzar con la sesión y el usuario mockeados". El segundo usuario permite probar CP-38.                            |
| Mercado Pago               | Pantalla propia que simula el checkout, con botones "Pagar" y "Simular pago rechazado".                                                                                                                                        | FAQ 4. El resultado llega por un endpoint que hace las veces de _webhook_.                                                          |
| Mail                       | Servicio simulado que guarda los mails en memoria. El front los muestra en un modal "Mail enviado a …".                                                                                                                        | FAQ 5. El contenido incluye orden, fecha, cantidad, detalle por visitante con subtotal y total.                                     |
| Tipo de pase               | Se elige **por visitante**.                                                                                                                                                                                                    | Los criterios hablan de "los tipos de pase" (CP-39) y permiten combinar VIP y Regular en una compra. FAQ 21: solo cambia el precio. |
| Límite de 10 entradas      | Por usuario y fecha, sumando las compras **confirmadas** y las **pendientes en boletería**. Las rechazadas y las que todavía esperan a Mercado Pago no cuentan, pero el límite **se vuelve a controlar al aprobarse el pago**. | FAQ 27. Así una compra con tarjeta abandonada no bloquea al usuario, y tampoco se pueden superar las 10 con compras en paralelo.    |
| "Exactamente un mes"       | Mismo día del mes siguiente. Si no existe (31/01), el último día de ese mes (28/02).                                                                                                                                           | CP-17 y CP-18, FAQ 25.                                                                                                              |
| Hora límite para hoy       | Hasta las 17:30 **inclusive**, en hora de Córdoba.                                                                                                                                                                             | CP-13, FAQ 26.                                                                                                                      |
| Edad                       | Entero entre 0 y 120. Edad 0 (bebés) es válida y no paga.                                                                                                                                                                      | CP-24 y CP-28. El máximo de 120 evita datos absurdos.                                                                               |
| Efectivo                   | Se registran las entradas con código, pero la compra queda `abonada: false`.                                                                                                                                                   | CP-43, criterio 26.                                                                                                                 |
| Pago con tarjeta pendiente | Una compra que espera a Mercado Pago no ocupa cupo. Si al aprobarse el pago ya se superaron las 10 entradas, o la fecha pasó, la compra se rechaza.                                                                            | En una integración real con Mercado Pago, ese caso implicaría devolver el dinero.                                                   |
| Endpoints de Mercado Pago  | No exigen sesión.                                                                                                                                                                                                              | Simulan las llamadas que haría Mercado Pago, que no tiene la sesión del usuario. En producción se validaría la firma del _webhook_. |
| Persistencia               | En memoria: se reinicia al reiniciar el servidor.                                                                                                                                                                              | La US no define persistencia. El repositorio es un puerto, así que se puede cambiar por una base de datos sin tocar el dominio.     |

## 6. Diseño visual

- **Paleta (FAQ 3):** `#386641` (verde bosque: encabezado, botones), `#6A994E` (verde hoja: acentos), `#A7C957` (lima: días disponibles, descuentos), `#F2E8CF` (crema: resumen, fondos) y `#BC4749` (rojo: errores y días cerrados).
- **Tipografía:** Lato (Google Fonts).
- **Logo:** `frontend/public/logo.svg`. Montañas y una hoja dentro de un círculo, con el sol en rojo de la paleta. Queda **sujeto a validación del PO** (FAQ 17).
- **Calendario:** los días cerrados (lunes, 25/12 y 1/1) aparecen **deshabilitados y tachados**, y los que están fuera del rango de compra, en gris (FAQ 2).
- **Flujo en 4 pasos numerados:** fecha → cantidad → visitantes y pase → forma de pago, con un resumen que muestra el total en vivo.
- **Accesibilidad:** etiquetas `aria` en todos los controles, foco visible, el modal se cierra con Escape y hay buena relación de contraste.

## 7. Estilo de código

La consigna pide respetar las reglas de estilo elegidas por el grupo en el TP2. Esas reglas se verifican automáticamente:

- **Prettier** (`.prettierrc.json` en la raíz): comillas simples, punto y coma, coma final, ancho máximo de 120 caracteres y 2 espacios de indentación.
- **ESLint** (`eslint.config.js` en cada proyecto): reglas recomendadas de JavaScript y TypeScript, y de los hooks de React en el front. Además:
  - `eqeqeq`: siempre `===`.
  - `prefer-const` y `no-var`.
  - Llaves obligatorias en bloques de varias líneas.
  - **Convención de nombres** (`@typescript-eslint/naming-convention`):
    - `camelCase` para variables, funciones y parámetros.
    - `PascalCase` para tipos, interfaces, clases y componentes de React.
    - `UPPER_CASE` para constantes de configuración (`PRECIOS_BASE`, `MAXIMO_ENTRADAS_POR_FECHA`).
- Los identificadores, mensajes y comentarios están **en español**, igual que el dominio del enunciado.

Para verificarlo: `npm run lint` y `npm run format:check` en cada carpeta. Hoy los dos terminan sin errores.

> Si la guía del TP2 define otra regla, se cambia en estos dos archivos de configuración y se vuelve a correr `npm run format`.

## 8. Cómo ejecutar

Requisitos: Node.js **22.12 o superior** (lo exigen Vite 8 y Vitest 5).

```bash
# Terminal 1 — API (http://localhost:3001)
cd backend
npm install
npm run dev

# Terminal 2 — Front (http://localhost:5173)
cd frontend
npm install
npm run dev
```

Para correr los tests:

```bash
cd backend && npm test        # 101 tests
cd frontend && npm test       # 42 tests
npm run lint                  # reglas de estilo (ESLint)
npm run format:check          # formato (Prettier)
npm run coverage              # en cualquiera de las dos carpetas: tests + cobertura
```

## 9. Integración real con Mercado Pago (Checkout Pro)

Además de la simulación que permite el FAQ 4, se integró el **Checkout Pro** de Mercado Pago con **credenciales de prueba**: el comprador sale de la app, paga en Mercado Pago y vuelve. La simulación de las secciones anteriores **sigue disponible** y es la opción por defecto. Si no hay credenciales configuradas, la app funciona igual que antes.

> Las cifras de tests y cobertura de las secciones 1, 4 y 8 corresponden al estado previo a esta integración. Las actuales se informan en esta sección.

### Arquitectura

La integración aprovecha el puerto `PasarelaPago` de la sección 3: se agregó un adaptador nuevo y no hizo falta cambiar las reglas de negocio existentes.

```
backend/src
├── dominio/
│   ├── puertos.ts                  PasarelaPago suma consultarPago(pagoId) → { compraId, estado }
│   ├── compraEntradas.ts           + confirmarPagoMercadoPago y obtenerCompra
│   └── errores.ts                  + tipo PASARELA (Mercado Pago no disponible → 502)
├── infraestructura/
│   ├── mercadoPagoCheckoutPro.ts   NUEVO: API REST de Mercado Pago (preferencias y pagos)
│   └── mercadoPagoSimulado.ts      sin cambios de comportamiento
└── server.ts                       elige el adaptador: con MP_ACCESS_TOKEN usa Checkout Pro

frontend/src
├── components/PantallaRetornoPago.tsx   NUEVO: pantalla a la que vuelve el comprador
├── borradorGuardado.ts                  NUEVO: guarda el formulario mientras se paga
└── navegacion.ts                        + irAUrlExterna para salir al checkout
```

- `crearApp` recibe la pasarela por `Dependencias`, igual que el reloj, el mail y el repositorio. Los tests siguen usando dobles y nunca llaman a Mercado Pago.
- El adaptador usa `fetch` contra la API REST (`POST /checkout/preferences` y `GET /v1/payments/{id}`), sin el SDK. Así se le puede inyectar un `fetch` falso en los tests.

### Flujo con tarjeta

```
 [front] Ir a pagar ──► POST /api/compras ──► crea la preferencia en Mercado Pago ──► init_point
                                                                                         │
 [Mercado Pago] el comprador paga ◄──────── redirección (se guarda el borrador) ◄────────┘
        │
        └─► vuelve a /pago/retorno?compra=ID&payment_id=...&status=...
                 │
                 └─► POST /api/mercado-pago/pagos/:pagoId/confirmacion
                          │  el backend consulta GET /v1/payments/:pagoId a Mercado Pago
                          ├─ approved              → CONFIRMADA (entradas + mail)
                          ├─ rejected / cancelled  → RECHAZADA
                          └─ pending / in_process  → sigue PENDIENTE_MERCADO_PAGO ("Consultar de nuevo")
```

### Endpoints agregados

| Método | Ruta                                           | Uso                                                                                             |
| ------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| GET    | `/api/compras/:id`                             | Compra y mensaje según su estado. Se usa al volver de Mercado Pago sin pagar.                   |
| POST   | `/api/mercado-pago/pagos/:pagoId/confirmacion` | Consulta el pago a Mercado Pago y confirma o rechaza la compra. Responde con `ResultadoCompra`. |

Los endpoints de la simulación (`/api/mercado-pago/:id` y `/api/mercado-pago/:id/resultado`) se mantienen sin cambios.

### Decisiones

| Tema                                 | Decisión                                                                                                                                             | Fundamento                                                                                                                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fuente de verdad del pago            | El backend **consulta el pago a la API de Mercado Pago**. No se confía en el `status` que trae la URL de retorno.                                    | Cualquiera puede escribir `status=approved` en la barra de direcciones. Criterios 23 y 24: la compra se confirma solo si Mercado Pago informa el pago aprobado.                       |
| Sin _webhook_                        | La confirmación se hace cuando el comprador vuelve a la app.                                                                                         | Mercado Pago no puede notificar a `localhost`. Un pago que queda "en proceso" se actualiza con el botón "Consultar de nuevo".                                                         |
| Idempotencia                         | Confirmar un pago ya registrado devuelve el estado actual. No se generan de nuevo las entradas ni se reenvía el mail.                                | El comprador puede recargar la página de retorno o volver con el botón "Atrás".                                                                                                       |
| Sesión en los endpoints nuevos       | `GET /api/compras/:id` y la confirmación **exigen sesión** y que la compra sea del usuario.                                                          | Devuelven los datos de la compra y los códigos de las entradas. A diferencia de la simulación (sección 5), las llama el navegador del comprador y no Mercado Pago.                    |
| URL de retorno `https`               | El front se sirve en `https://localhost:5173` con `npm run dev:https` (plugin `@vitejs/plugin-basic-ssl`).                                           | Mercado Pago **descarta las `back_urls` con `http`** sin informar un error, incluso en `localhost`. Se verificó creando preferencias con distintas URLs.                              |
| Vuelta automática al sitio           | Se pide `auto_return: approved` solo si la URL del front es `https`.                                                                                 | Con una URL `http` Mercado Pago no guarda la URL de retorno, así que no tendría adónde volver.                                                                                        |
| Compra de $0 con tarjeta             | Se confirma directamente, sin pasar por Mercado Pago.                                                                                                | Mercado Pago no acepta cobros de $0. Ocurre cuando todos los visitantes tienen hasta 3 años (criterio 16).                                                                            |
| Borrador del formulario              | Se guarda en `sessionStorage` justo antes de salir al checkout y se recupera **una sola vez** al volver.                                             | Al salir de la app se pierde el estado en memoria. Así, "Volver a intentar" después de un rechazo conserva los datos. Solo se guardan fecha, cantidad, edades, pases y forma de pago. |
| Credenciales                         | `MP_ACCESS_TOKEN` en `backend/.env`, que no se comparte. `backend/.env.example` es la plantilla sin valores.                                         | El Access Token solo debe vivir en el backend. Checkout Pro no necesita la Public Key en el front.                                                                                    |
| Credenciales `TEST-`                 | Si el token empieza con `TEST-` se usa `sandbox_init_point`; si no, `init_point`.                                                                    | Las cuentas de prueba actuales usan tokens `APP_USR-`, pero se mantiene compatibilidad con el formato anterior.                                                                       |
| Mercado Pago no disponible           | Se responde 502: "No se pudo conectar con Mercado Pago. Intentá de nuevo en unos minutos". El detalle se registra en el log del servidor.            | El usuario recibe un mensaje claro en lugar de "Ocurrió un error inesperado" (500).                                                                                                   |
| Pago aprobado con la compra inválida | **No implementado:** si se aprueba un pago pero se superó el límite de 10 entradas o pasó la fecha, la compra se rechaza y el dinero no se devuelve. | Es la limitación que ya anticipaba la sección 5. Se resolvería con un reembolso (`POST /v1/payments/{id}/refunds`).                                                                   |

### Ciclo TDD de la integración

| Ciclo                      | Pruebas (Red)                                                                                                                                                                                                                                                                                                                                              | Implementación (Green)                                                                                                                  | Refactor                                                                                                                                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8. Back: Checkout Pro      | 25 tests nuevos: 11 en `compraEntradas.test.ts` (confirmación aprobada, rechazada y pendiente, idempotencia, pago inexistente, sesión, compra de otro usuario, consulta de la compra y total de $0), 5 en `app.test.ts` y 9 en `mercadoPagoCheckoutPro.test.ts` con un `fetch` falso. Fallaban 16 y el archivo del adaptador no cargaba porque no existía. | `confirmarPagoMercadoPago`, `obtenerCompra`, el adaptador `MercadoPagoCheckoutPro`, las dos rutas nuevas y el tipo de error `PASARELA`. | La confirmación de una compra se extrajo a `confirmar()`, que comparten el pago aprobado y el total de $0. Los mensajes por estado se unificaron en `mensajeSegunEstado`. Se aplicó Prettier. Back 126/126 (los 101 anteriores sin cambios).    |
| 9. Front: salida y retorno | 8 tests nuevos: `PantallaRetornoPago.test.tsx` (5: aprobado, rechazado, volver sin pagar, pago en proceso y error), redirección externa con borrador guardado en `PantallaCompra.test.tsx`, recuperación del borrador en `App.test.tsx` y confirmación en `api.test.ts`. Fallaban porque los módulos no existían.                                          | `PantallaRetornoPago`, `borradorGuardado.ts`, `irAUrlExterna` y la ruta `/pago/retorno` en `App`.                                       | `finalizar` en `App` pasó a `useCallback` para que la pantalla de retorno no repita la consulta en cada render. La pantalla de retorno reemplaza su entrada del historial al pasar a `/resultado`. Front 52/52 (los 44 anteriores sin cambios). |

### Trazabilidad

| Casos de prueba                                     | Archivo de test                                                                              |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| CP-40 (redirección real al checkout)                | `mercadoPagoCheckoutPro.test.ts` + `PantallaCompra.test.tsx` + `app.test.ts`                 |
| CP-41, CP-42 (resultado informado por Mercado Pago) | `compraEntradas.test.ts` + `mercadoPagoCheckoutPro.test.ts` + `PantallaRetornoPago.test.tsx` |
| CP-37 (sesión al confirmar o consultar una compra)  | `compraEntradas.test.ts` + `app.test.ts`                                                     |
| CP-49 (flujo completo con tarjeta)                  | `app.test.ts` + prueba manual de punta a punta (abajo)                                       |

### Prueba manual de punta a punta

Con un vendedor y un comprador de prueba de Mercado Pago Argentina se compraron 2 entradas para el 23/10/2026 (Regular + VIP, $30.000), con el saldo de la cuenta del comprador de prueba. Mercado Pago devolvió al comprador a la app y la compra quedó **confirmada**: orden `#000002`, entradas `EHP-000002-1` y `EHP-000002-2`, y mail de confirmación. Consultando la API de Mercado Pago, el pago `184185312089` figura `approved` / `accredited`, por $30.000 ARS, con `external_reference` `000002`.

También se probó con las tarjetas de prueba de Mercado Pago, que es el caso que pide la primera prueba de usuario de la consigna:

| Caso                        | Pago en Mercado Pago                                          | Resultado en la app                                                                   |
| --------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Tarjeta de crédito aprobada | `185235977076`: `approved` / `accredited`, Mastercard crédito | Orden `#000005` **confirmada**, con entradas y mail de confirmación.                  |
| Tarjeta rechazada           | `185228742092` y `185228937852`: `cc_rejected_other_reason`   | Orden `#000003` **rechazada**. "Volver a intentar" conserva los datos del formulario. |

### Cobertura

|                                          | Líneas | Ramas |
| ---------------------------------------- | ------ | ----- |
| Backend (`src/`, sin contar `server.ts`) | 98,8%  | 97,3% |
| Frontend (`src/`, sin contar `main.tsx`) | 87,4%  | 86,9% |

En el back queda sin cubrir `consultarPago` del adaptador simulado y dos casos de `mensajeSegunEstado` (efectivo y rechazada al consultar una compra). En el front, igual que antes, lo que más baja la cobertura es el ruteo de `App.tsx`, que se verificó a mano.

### Cómo ejecutar con Mercado Pago

1. Copiar `backend/.env.example` como `backend/.env` y completar `MP_ACCESS_TOKEN` con el Access Token de prueba.
2. Levantar el back con `npm run dev` y el front con **`npm run dev:https`**.
3. Abrir `https://localhost:5173` (la primera vez hay que aceptar el certificado local) en una ventana de incógnito y pagar con un **usuario comprador de prueba**, con saldo en cuenta o con las tarjetas de prueba de Mercado Pago. El nombre del titular define el resultado: `APRO` aprobado, `OTHE` rechazado, `CONT` pendiente.

Sin `backend/.env`, `npm run dev` en las dos carpetas levanta la versión simulada de siempre. `backend/.env` contiene el Access Token y **no se incluye en la entrega**.

## 10. Envío real de mails con Resend

Además de la bandeja simulada que permite el FAQ 5, los mails de la compra pueden enviarse de verdad mediante **Resend**, un servicio de envío de correo con API HTTP. Igual que con Mercado Pago, es **opcional**: sin una API key configurada, la app sigue usando solo la bandeja simulada.

> Las cifras de tests y cobertura de la sección 9 corresponden al estado previo a esta integración. Las actuales se informan en esta sección.

### Arquitectura

Se aprovechó el puerto `ServicioEmail` que ya existía. El dominio no cambió: sigue generando el mismo asunto y el mismo cuerpo en texto.

```
backend/src/infraestructura
├── emailResend.ts          NUEVO: envía cada mail por la API de Resend (texto + HTML)
├── plantillaEmailHtml.ts   NUEVO: arma el resumen de compra en HTML a partir del cuerpo en texto
├── emailSimulado.ts        guarda el mail en la bandeja y, si hay un servicio real, además lo reenvía
└── sesionesSimuladas.ts    el usuario de demo puede usar una casilla real (EMAIL_USUARIO_DEMO)
backend/src/server.ts       con RESEND_API_KEY reenvía por Resend; sin ella, solo bandeja simulada
```

- La bandeja simulada **se mantiene siempre**: la pantalla de resultado la usa para mostrar el botón "Ver mail enviado".
- El adaptador usa `fetch` contra `POST https://api.resend.com/emails`, sin SDK, para poder inyectarle un `fetch` falso en los tests.

### Decisiones

| Tema                            | Decisión                                                                                                                                     | Fundamento                                                                                                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bandeja simulada + envío real   | `EmailSimulado` recibe opcionalmente un servicio real y le reenvía cada mail.                                                                | La app sigue mostrando el mail enviado en el modal (FAQ 5) y, además, el mail llega a una casilla real.                                                                      |
| Si falla el envío real          | El error se registra en el log del servidor y **la compra no se interrumpe**.                                                                | Cuando se envía el mail, la compra ya quedó registrada (y, con tarjeta, ya se cobró). Un problema del proveedor de correo no debe deshacerla ni mostrar un error al usuario. |
| Remitente                       | `EcoHarmony Park <onboarding@resend.dev>`, configurable con `EMAIL_REMITENTE`.                                                               | Es el remitente que Resend habilita sin verificar un dominio propio.                                                                                                         |
| Destinatario                    | El usuario de demo usa la casilla de `EMAIL_USUARIO_DEMO` en lugar de `visitante@ejemplo.com`.                                               | Sin dominio propio, Resend solo deja enviar a la casilla de la cuenta. Así la compra, el mail y la pantalla muestran la misma dirección, sin redirecciones ocultas.          |
| Lectura de `EMAIL_USUARIO_DEMO` | Se lee en cada pedido, no al cargar el módulo.                                                                                               | Los `import` se evalúan antes de que `server.ts` cargue el `.env`.                                                                                                           |
| Contenido del mail              | Texto plano (el mismo de siempre) + versión HTML con encabezado, datos de la compra, una fila por entrada y total, con la paleta del parque. | Criterios 27 y 28. Los estilos van en línea porque los clientes de correo ignoran las hojas de estilo. El texto se escapa para que no se interprete como HTML.               |
| Credenciales                    | `RESEND_API_KEY` en `backend/.env`, que no se comparte.                                                                                      | Igual que el Access Token de Mercado Pago.                                                                                                                                   |

### Ciclo TDD de la integración

| Ciclo                          | Pruebas (Red)                                                                                                                                                                                                                                                                                                | Implementación (Green)                                                                                      | Refactor                                                                                                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10. Back: envío con Resend     | 9 tests nuevos: `emailResend.test.ts` (envío por la API, error de Resend), `plantillaEmailHtml.test.ts` (datos, una fila por entrada, escape de HTML) y `emailSimulado.test.ts` (bandeja, reenvío, falla del reenvío). Fallaban 2 y los archivos de Resend y de la plantilla no cargaban porque no existían. | `EmailResend`, `plantillaEmailHtml` y el reenvío opcional en `EmailSimulado`. Configuración en `server.ts`. | Se aplicó Prettier. Back 135/135.                                                                                                                                                                                           |
| 11. Back: usuario de demo real | `sesionesSimuladas.test.ts`: con `EMAIL_USUARIO_DEMO`, el usuario de demo usa esa casilla y el usuario con mail inválido no cambia. Fallaba.                                                                                                                                                                 | `usuarioDeSesion` toma la casilla de `EMAIL_USUARIO_DEMO`.                                                  | Al principio los mails se redirigían a una casilla de prueba, pero la app seguía mostrando `visitante@ejemplo.com`. Con el usuario de demo real, la redirección quedó sin uso y se eliminó junto con su test. Back 135/135. |

### Trazabilidad

| Casos de prueba                                               | Archivo de test                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| CP-45 (mail de pago pendiente en efectivo)                    | `compraEntradas.test.ts` + `emailResend.test.ts` + `plantillaEmailHtml.test.ts` |
| CP-46 (mail de confirmación de un pago aprobado)              | `compraEntradas.test.ts` + `emailResend.test.ts` + `plantillaEmailHtml.test.ts` |
| CP-47 (sin mail de confirmación si se rechaza)                | `compraEntradas.test.ts` (sin cambios: el dominio no envía el mail)             |
| Criterios 27 y 28 sin interrumpir la compra si falla el envío | `emailSimulado.test.ts`                                                         |

### Prueba manual

Con la API key configurada, se registraron compras en efectivo y con tarjeta. Resend aceptó cada envío (el servidor no registró errores) y el modal de la app muestra el mail enviado a la casilla del usuario de demo.

### Cobertura

|                                          | Líneas | Ramas |
| ---------------------------------------- | ------ | ----- |
| Backend (`src/`, sin contar `server.ts`) | 98,6%  | 96,5% |
| Frontend (`src/`, sin contar `main.tsx`) | 87,4%  | 86,9% |

Tests actuales: **135 en el backend, 52 en el frontend y 27 E2E de Playwright**.

### Cómo ejecutar con Resend

1. Crear una cuenta en Resend con la casilla donde se quieren recibir los mails y generar una API key con permiso de envío.
2. En `backend/.env`, completar `RESEND_API_KEY` y poner esa casilla en `EMAIL_USUARIO_DEMO`.
3. Reiniciar el backend. La consola muestra `Mails con Resend (usuario de demo: …)`.

Sin `RESEND_API_KEY`, los mails solo se simulan. Al correr los E2E de Playwright conviene desactivarla: casi todas las pruebas compran en efectivo y cada compra enviaría un mail real.
