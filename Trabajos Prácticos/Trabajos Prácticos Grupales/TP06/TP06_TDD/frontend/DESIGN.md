# Diseño de la compra

## Dirección
Modo Operate: compra clara y compacta. Una superficie principal con secciones, filas de visitantes y un resumen lateral. La marca se expresa mediante Lato, el logo y la paleta; sin portada promocional que desplace los controles.

## Tokens
Bosque #386641; hoja #6a994e; lima #a7c957; crema #f2e8cf; rojo #bc4749. Texto #1f2d22; secundario #55665a; fondo #f8f4e8; blanco #ffffff. Texto normal 16px, ayuda 14px, mínimo 12px. Controles 48px, acciones compactas 44px. Espaciado 4/8/12/16/24/32/48. Radios 8px controles y 16px superficies. Ancho máximo 1180px.

## Estructura
Título breve → fecha → visitantes con cantidad integrada → pago → confirmación. Desktop: formulario y resumen 2:1. Hasta 900px: una columna, acceso al resumen mediante barra inferior, oculta cuando el resumen ya está a la vista. A 600px las filas se adaptan a dos líneas. No se inventan prestaciones VIP.

## Estados
Cotización pendiente explícita, valores aplicados por visitante provenientes de API, errores del servidor enfocados, borrador en memoria durante reintento. Confirmación primero; mail por acción explícita. Radix Dialog gestiona foco/Escape y Lucide provee íconos.
