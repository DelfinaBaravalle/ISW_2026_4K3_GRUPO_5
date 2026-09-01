# ISW_2026_4K3_GRUPO_5

**Plan de Gestión de Configuración de Software (SCM)**
Repositorio de Ingeniería y Calidad de Software

---

## Integrantes

| Estudiante | Legajo |
|---|---|
| Baravalle, Delfina | 400403 |
| Carrizo, Martin | 400562 |
| Coutsiers, Juan | 406128 |
| Cufre, Matias | 94898 |
| Gigena, Melina | 400089 |
| Martin Valentino, Camilo | 400312 |
| Maurino Medina, Gonzalo | 401062 |
| Mendiolaza, María Guadalupe | 401115 |
| Padilla, Tomás Lautaro | 94192 |
| Passon, Ezequias | 402046 |
| Peralta, Santino | 403430 |
| Rodriguez, Camila Belén | 400402 |
| San Felipe, Tomas | 95609 |
| Zapata, Catalina | 400247 |

---

## Convenciones generales

Decisiones tomadas por el grupo y aplicadas de forma consistente en todo el repositorio:

- **Nombre del repositorio:** `ISW_2026_4K3_GRUPO_5` (materia _ año _ comisión _ grupo).
- **Carpetas:** se permiten espacios y tildes en pos de la legibilidad. Es una decisión consciente: se prioriza la claridad de lectura por sobre la comodidad en línea de comandos.
- **Numeración:** se usan **dos dígitos** para que los ítems se ordenen solos (ej. `TP04`, no `TP4`).
- **Fechas:** formato **ISO `AAAA-MM-DD`** (ej. `2026-09-01`) para que ordenen cronológicamente.
- **Separador en nombres de archivo:** guion bajo (`_`).
- **Motor de control de versiones:** Git, repositorio de acceso público.

---

## Estructura del repositorio

```
ISW_2026_4K3_GRUPO_5/
│
├── Bibliografía/
│   └── Unidad_[U]/
│
├── Presentaciones de Clase/
│   └── Unidad_[U]/
│
├── Trabajos Prácticos/
│   ├── Trabajos Prácticos Grupales/
│   │   └── TP[N]/
│   └── Trabajos de Investigación Grupales/
│       └── TIG[N]/
│
├── Material de estudio/
│   ├── Ejercicios prácticos resueltos/
│   ├── Notas de Clase/
│   │   ├── Teóricos/
│   │   └── Prácticos/
│   └── Resúmenes/
│
├── Gestión de Configuración/           (documentación de SCM e ítems administrativos)
│   ├── Plan_SCM.md
│   ├── Cronograma_2026_2doCuatri.txt
│   └── Link_Clases_Grabadas.txt
│
└── README.md                           (breve descripción del repo y enlace a este Plan)
```

---

## Listado de ítems de configuración

Criterio de tipo:
- **Producto** — ítem generado por el grupo como parte del trabajo de la materia; evoluciona con los commits del grupo.
- **Recurso** — material de referencia o insumo (de la cátedra o externo) que el grupo resguarda pero no produce.

| Nombre del ítem | Tipo | Regla de nombrado | Ubicación física |
|---|---|---|---|
| Bibliografía | Recurso | `[Título-del-libro]_[Autor].pdf` | `/Bibliografía/Unidad_[U]/` |
| Presentaciones de Clase | Recurso | `[M]_[Tema].pdf` | `/Presentaciones de Clase/Unidad_[U]/` |
| Trabajos Prácticos Grupales | Producto | `TP[N]_[Tema].[EXT]` | `/Trabajos Prácticos/Trabajos Prácticos Grupales/TP[N]/` |
| Trabajos de Investigación Grupales | Producto | `TIG[N]_[Tema].[EXT]` | `/Trabajos Prácticos/Trabajos de Investigación Grupales/TIG[N]/` |
| Consigna de TP | Recurso | `Consigna_TP[N].pdf` | `/Trabajos Prácticos/Trabajos Prácticos Grupales/TP[N]/` |
| Lineamientos para TIG | Recurso | `Lineamientos_TIG[N].pdf` | `/Trabajos Prácticos/Trabajos de Investigación Grupales/TIG[N]/` |
| Ejercicios Prácticos resueltos | Producto | `[Tema]_Caso[I]_[Apellido].[EXT]` | `/Material de estudio/Ejercicios prácticos resueltos/` |
| Guía de Ejercicios Prácticos | Recurso | `Guía_Ejercicios.pdf` | `/Material de estudio/Ejercicios prácticos resueltos/` |
| Notas de Clase | Producto | `[Tema]_[Fecha]_[Apellido].pdf` | `/Material de estudio/Notas de Clase/{Teóricos\|Prácticos}/` |
| Resúmenes | Producto | `Resumen_Parcial[J]_[Apellido].pdf` | `/Material de estudio/Resúmenes/` |
| Cronograma | Recurso | `Cronograma_2026_2doCuatri.txt` | `/Gestión de Configuración/` |
| Clases Grabadas | Recurso | `Link_Clases_Grabadas.txt` | `/Gestión de Configuración/` |
| Plan SCM | Producto | `Plan_SCM.md` | `/Gestión de Configuración/` |

---

## Referencia

| Sigla | Significado |
|---|---|
| Tema | Nombre del tema. |
| M | Número de presentación. |
| EXT | Extensión del archivo (ej.: pdf, docx, txt, json). |
| N | Número de Trabajo Práctico / Trabajo de Investigación (dos dígitos). |
| I | Número de caso práctico. |
| Apellido | Apellido del propietario del archivo. |
| Fecha | Fecha de la clase, formato ISO `AAAA-MM-DD`. |
| J | Número de parcial. |
| U | Número de unidad. |
| TP | Trabajo Práctico. |
| TIG | Trabajo de Investigación Grupal. |

---

## Criterio de línea base

La línea base se marca **al finalizar cada Trabajo Práctico evaluado por la cátedra** y **luego de cada evaluación parcial**. Se adopta este criterio porque una línea base debe representar un punto de referencia estable y **validado externamente**: la corrección de la cátedra es justamente esa validación.

Se **excluyen deliberadamente los Trabajos Prácticos no evaluables**: si bien se resuelven y se versionan en el repositorio como cualquier otro ítem, no constituyen un punto de referencia validado por la cátedra, por lo que no ameritan una línea base. La exclusión es una decisión de criterio del grupo, no una omisión.

Como consecuencia, el número de Trabajo Práctico y el de línea base no necesariamente coinciden (habrá TPs sin línea base). Por eso el tag identifica el hito por su nombre y no por un contador propio, de modo que cada línea base quede asociada sin ambigüedad al TP que le corresponde, aunque existan huecos en la numeración.

Cada línea base se **marca efectivamente en el repositorio** mediante un *tag* anotado de Git, con la convención:

```
LB_[hito]_[AAAA-MM-DD]
```

Ejemplo: `LB_TP04_2026-09-01`. El tag deja el estado del repositorio como un punto recuperable e inmutable en el tiempo.

**Primera línea base de este entregable:** se marca sobre el estado del repositorio correspondiente a la entrega del **TP4 – SCM**.

Comandos de referencia:

```bash
git tag -a LB_TP04_2026-09-01 -m "Línea base: entrega TP4 - SCM"
git push origin LB_TP04_2026-09-01
```
