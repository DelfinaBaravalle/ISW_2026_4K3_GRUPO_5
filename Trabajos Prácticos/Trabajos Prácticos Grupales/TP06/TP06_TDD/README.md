# EcoHarmony Park · Comprar entradas (TP6 – TDD)

ISW 2026 · 4K3 · Grupo 5. Implementación de la US **Comprar entradas** con TDD, en TypeScript.

## Contenido

- `backend/`: API en Node + Express, reglas de negocio y 101 tests originales. Backend sin cambios durante el rediseño.
- `frontend/`: aplicación responsive React + Vite, interfaz actualizada, logo oficial y 44 pruebas.
- `docs/decisiones-de-diseno.md`: decisiones originales y bitácora del ciclo TDD.
- `docs/auditoria-ux-ui.md`: auditoría, cambios, verificaciones y límites del rediseño.
- `frontend/PRODUCT.md`, `frontend/DESIGN.md` y `frontend/.impeccable/design.json`: contexto y sistema de diseño.
- `docs/EcoHarmony_Informe_TDD_Grupo_5.docx`: informe formal del TP (documento de decisiones de diseño pedido por la consigna).
- `docs/TP_TDD_Grupo5_Pruebas_Compra_Entradas.docx`: documento de pruebas del grupo (Test List PU-01 a PU-50).

## Requisitos

- Node.js **22.22.2 o posterior de la rama 22** y npm. Las dependencias actuales de pruebas requieren esa versión mínima de Node 22.
- Acceso a internet para instalar dependencias. Lato se carga desde Google Fonts; hay fuente de respaldo si no está disponible.

## Levantar la aplicación

Descomprimir el ZIP y abrir dos terminales en la carpeta `TP6`.

**Terminal 1 — backend**

```bash
cd backend
npm ci
npm run dev
```

API: http://localhost:3001.

**Terminal 2 — frontend**

```bash
cd frontend
npm ci
npm run dev
```

Aplicación: **http://localhost:5173**. El frontend redirige las peticiones `/api` al backend mediante Vite.

En PowerShell, si la política de scripts bloquea `npm.ps1`, usar `npm.cmd` en lugar de `npm`.

La sesión, Mercado Pago y el correo están **simulados**, según permite el FAQ. Los datos del backend viven en memoria y se reinician al detener el servidor. El borrador de compra se conserva durante la navegación de la aplicación, pero no tras una recarga completa.

## Pruebas y compilación

Desde cada carpeta (`backend` o `frontend`):

```bash
npm test
npm run lint
```

Para compilar el frontend, desde `frontend`:

```bash
npm run build
```

El resultado se genera en `frontend/dist`. Para trabajar y revisar el flujo completo, usar los dos servidores de desarrollo indicados arriba.

## Acerca del paquete

Se incluyen código fuente, pruebas, configuración, recursos y archivos `package-lock.json` para reinstalar las versiones de las dependencias con `npm ci`.

No se incluyen `node_modules`, compilaciones generadas, cachés ni sesiones temporales de auditoría. Las skills de Codex utilizadas para diseñar y auditar están documentadas; no son necesarias para ejecutar la aplicación. La carpeta local `UXUI/` no forma parte de este paquete.

## Integración con Mercado Pago (Checkout Pro)

Además de la simulación, el pago con tarjeta puede hacerse con el **Checkout Pro real de Mercado Pago**, usando credenciales de prueba. Si no se configuran credenciales, la aplicación usa la simulación descripta arriba y todo funciona igual.

Detalle de diseño, decisiones y ciclo TDD: `docs/decisiones-de-diseno.md`, sección 9.

**Configuración**

1. En `backend`, copiar `.env.example` como `.env` y completar `MP_ACCESS_TOKEN` con el Access Token de las credenciales de prueba.
2. Dejar `FRONTEND_URL=https://localhost:5173`. Mercado Pago descarta las direcciones de retorno `http`, así que el frontend tiene que servirse por `https`.

**Levantar la aplicación con Mercado Pago**

**Terminal 1 — backend**

```bash
cd backend
npm run dev
```

Al iniciar, la consola muestra `Pagos con Mercado Pago (Checkout Pro)`.

**Terminal 2 — frontend**

```bash
cd frontend
npm run dev:https
```

Aplicación: **https://localhost:5173**. La primera vez el navegador avisa que el certificado es local: elegir continuar a `localhost`.

**Probar un pago**

- Usar una ventana de incógnito e iniciar sesión en Mercado Pago con un **usuario comprador de prueba**, distinto del vendedor dueño de las credenciales.
- Se puede pagar con el saldo de la cuenta de prueba o con las tarjetas de prueba de Mercado Pago. El nombre del titular define el resultado: `APRO` aprobado, `OTHE` rechazado, `CONT` pendiente.
- Al terminar, Mercado Pago vuelve a la aplicación, que consulta el estado del pago y muestra el resultado.

`backend/.env` contiene el Access Token: **no debe incluirse en el ZIP ni subirse a un repositorio**.

**Pruebas**

Las pruebas no se conectan a Mercado Pago: usan dobles de prueba. Con la integración, `npm test` corre 126 tests en `backend` y 52 en `frontend`.
