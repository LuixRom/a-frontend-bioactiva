# CRM Interno BioActiva

Sistema CRM web construido para reemplazar el Excel con macros que BioActiva usa actualmente para gestionar su proceso comercial. Centraliza organizaciones, contactos, leads y cotizaciones en una interfaz moderna con pipeline visual, búsqueda SUNAT en tiempo real, gestión de actividades y carga masiva desde Excel.

---

## Contexto del negocio

BioActiva es una consultora peruana de proyectos de innovación (fondos CONCYTEC, Ley 30309, cadenas de valor, etc.). Su proceso comercial completo vivía en un Excel con macros: contactos, organizaciones, leads y cotizaciones en hojas separadas. Los problemas principales:

- Registro manual y repetitivo de datos
- Duplicidad de información entre hojas
- Sin historial estructurado de interacciones con clientes
- Sin indicadores ni métricas comerciales
- Problemas de edición simultánea (co-autoría en Excel)
- Difícil seguimiento de oportunidades abiertas

---

## Modelo de datos central

La jerarquía del sistema es:

```
Organización → Contacto(s) → Lead → Cotización(es)
```

### Organización
Empresa, entidad pública, ONG o academia con la que BioActiva trabaja o prospecta.

```typescript
Organization {
  id: string           // "ORG-2025-001"
  ruc?: string         // Opcional — no toda org tiene RUC peruano
  nombre: string       // Nombre corto de trabajo
  nombreCompleto?: string
  area?: string        // Área dentro de la org (ej. Gerencia de Innovación)
  tipo?: string        // Empresa nacional, Gobierno nacional, ONG, Academia…
  tamano?: string      // Grande, Mediano, Pequeño, Micro
  sector?: string      // 27 sectores del negocio
  ubicacion?: string   // Departamento del Perú
  linkedin?: string
  alianzas?: string
  actividades?: string // Actividad económica (desde SUNAT)
  creadoEn: Date
}
```

### Contacto
Persona específica dentro de una organización. Un contacto no es un lead — es solo quien trabaja ahí.

```typescript
Contact {
  id: string           // "CON-2025-001"
  organizacionId: string
  vocativo?: string    // Sr., Sra., Srta.
  nombres: string
  apellidos: string
  correo1: string
  correo2?: string
  telefono?: string
  cargo?: string
  comentarios?: string
  creadoEn: Date
}
```

### Lead
Oportunidad comercial concreta. Un lead NO es una empresa ni un contacto — es la oportunidad de negocio entre BioActiva y ese contacto/empresa. Una misma empresa puede tener múltiples leads a lo largo del tiempo (servicios distintos, años distintos).

```typescript
Lead {
  id: string                 // "LEAD-2025-001"
  organizacionId: string     // FK → Organization
  contactoId: string         // FK → Contact (persona a cargo)
  servicioInteres?: string   // Qué servicio de BioActiva le interesa
  canal?: string             // Cómo llegó: Referido, LinkedIn, Evento, Web…
  encargado?: string         // Quién de BioActiva lleva este lead
  encargadoEmail?: string
  estado: EstadoLead         // Ver estados abajo
  desafioOportunidad?: string
  comentarios?: string       // Notas internas del lead
  historial?: string         // Resumen de contexto general
  proximaActividad?: string  // Se sincroniza automáticamente desde actividades
  fechaProximaActividad?: Date
  fechaCierre?: Date
  actividades: Activity[]    // Cronología de interacciones
  creadoEn: Date
}
```

#### Estados del lead (alineados al Excel de BioActiva)

| ID | Label | Significado |
|---|---|---|
| `en_prospecto` | En prospecto | Lead identificado, sin propuesta enviada aún |
| `ofertado` | Ofertado | Se envió cotización, esperando respuesta |
| `cierre_con_venta` | Cierre con venta | Negocio cerrado exitosamente |
| `cierre_sin_venta` | Cierre sin venta | Lead cerrado, no prosperó |

### Actividad
Interacción registrada dentro de un lead. Tiene estado propio derivado de su fecha.

```typescript
Activity {
  id: string
  tipo: 'reunion' | 'llamada' | 'email' | 'otro'
  estado: 'pendiente' | 'realizada'
  nota: string
  responsable: string
  fecha: Date
  fechaCompletada?: Date
}
```

Estado derivado automáticamente (`activityStatus.ts`):
- `realizada` → marcada manualmente como completada
- `vencida` → fecha pasada y aún no realizada
- `pendiente` → fecha futura

### Cotización
Propuesta económica enviada al cliente. Siempre pertenece a un lead específico.

```typescript
Quote {
  id: string              // "COT-2025-001"
  leadId: string          // FK → Lead
  anio: number
  mes: string             // Enero, Febrero…
  dirigidoA: string       // Nombre del contacto destinatario
  fechaCotizacion: Date
  cliente: string         // Razón social del cliente
  producto?: string       // Línea de producto BioActiva (ej. Innovasuys)
  servicio: string        // Descripción del servicio cotizado
  monto: number
  moneda: 'PEN' | 'USD'
  estado: 'enviada' | 'aceptada' | 'rechazada' | 'pendiente'
  remitente: string       // Quién firma la cotización
  observacion?: string
  linkPropuesta?: string  // Link a Drive/archivo
  creadoEn: Date
}
```

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS |
| Tipos | TypeScript |
| Scraping SUNAT | Python 3.12, FastAPI, Playwright (Chromium headless) |
| Íconos | Lucide React |
| Excel parsing | SheetJS (xlsx) |
| Fuzzy matching | string-similarity (Dice coefficient) |
| Drag & drop | @hello-pangea/dnd |
| Autenticación | @azure/msal-browser (MSAL) |
| Integración | Microsoft Graph API (Microsoft Teams) |

---

## Estructura del proyecto

```
a-frontend-bioactiva/
├── app/                              # Páginas Next.js (App Router)
│   ├── page.tsx                      # Dashboard principal con métricas
│   ├── organizations/page.tsx        # CRUD organizaciones + SUNAT + historial quotes
│   ├── contacts/page.tsx             # CRUD contactos
│   ├── pipeline/page.tsx             # Kanban de leads + formulario creación
│   ├── quotes/page.tsx               # Registro y gestión de cotizaciones
│   ├── bulk-upload/page.tsx          # Carga masiva desde Excel (.xlsx)
│   ├── search/page.tsx               # Búsqueda global
│   ├── notifications/page.tsx        # Centro de notificaciones
│   ├── events/page.tsx               # Calendario de actividades
│   ├── users/page.tsx                # Gestión de usuarios
│   ├── profile/page.tsx              # Perfil de usuario y vinculación Microsoft Teams
│   └── api/
│       ├── search-document/route.ts  # Proxy → SUNAT por RUC
│       ├── search-nombre/route.ts    # Proxy → SUNAT por razón social
│       ├── leads/[id]/route.ts       # PATCH estado del lead
│       ├── leads/[id]/activities/    # POST/PATCH actividades
│       ├── bulk-import/route.ts      # POST importación masiva
│       └── notifications/route.ts   # GET notificaciones
│
├── src/
│   ├── types/crm.ts                  # Tipos centrales (Organization, Contact, Lead, Quote, Activity)
│   ├── lib/
│   │   ├── constants.ts              # Enums del negocio (vocativos, sectores, departamentos, estados)
│   │   ├── mockData.ts               # Datos de prueba para desarrollo
│   │   ├── activityStatus.ts         # Derivar estado de actividad + sincronizar lead
│   │   ├── excel-mapper.ts           # Tipos de importación + processExcelData()
│   │   ├── columnMapper.ts           # Normaliza columnas del Excel al modelo CRM
│   │   ├── deduplication.ts          # Detección de duplicados (exacto + fuzzy 85%)
│   │   ├── exportCsv.ts              # Exportar tablas a CSV
│   │   ├── alertLevel.ts             # Nivel de alerta para actividades
│   │   ├── checkAndNotify.ts         # Lógica de notificaciones
│   │   ├── buildExportFilename.ts    # Nombres de archivos exportados
│   │   ├── calendarLink.ts           # Generar links de Google Calendar
│   │   ├── msalConfig.ts             # Configuración de MSAL para Microsoft Graph
│   │   └── utils.ts                  # cn() y formatters (currency, date)
│   └── components/
│       ├── Sidebar.tsx               # Navegación lateral
│       ├── ui/
│       │   ├── DataTable.tsx         # Tabla genérica: búsqueda, orden, paginación, export
│       │   ├── SunatInput.tsx        # Input RUC con consulta SUNAT automática
│       │   ├── ValidadorSunat.tsx    # Drawer de consulta SUNAT: por RUC o razón social
│       │   ├── Drawer.tsx            # Panel lateral deslizante
│       │   ├── Toast.tsx             # Notificaciones toast
│       │   └── Timeline.tsx          # Línea de tiempo de actividades del lead
│       ├── pipeline/
│       │   ├── KanbanColumn.tsx      # Columna del tablero kanban
│       │   └── LeadPanel.tsx         # Panel detalle/edición de lead + actividades
│       └── filters/
│           └── FilterPanel.tsx       # Filtros del pipeline
│
└── sunat_service/                    # Microservicio Python separado
    ├── main.py                       # FastAPI + Playwright scraper
    └── requirements.txt
```

---

## Flujos principales

### Flujo 1 — Crear organización

1. Usuario va a **Organizaciones** → "Nueva Organización"
2. Abre drawer con formulario.
3. Puede consultar SUNAT de dos formas:
   - **Por RUC**: ingresa 11 dígitos → sistema llama automáticamente a SUNAT → autocompleta razón social, ubicación, actividades económicas
   - **Por Razón Social**: escribe nombre de empresa (mín. 3 caracteres) → debounce 500ms → dropdown con resultados SUNAT → al seleccionar uno, dispara búsqueda por RUC para completar todos los campos
4. Completa campos manuales: tipo, tamaño, sector, departamento, LinkedIn
5. Guarda → organización aparece en la tabla

### Flujo 2 — Crear contacto

1. Usuario va a **Contactos** → "Nuevo Contacto"
2. Selecciona organización existente del dropdown
3. Completa: vocativo, nombres, apellidos, correo, teléfono, cargo
4. Guarda → contacto queda vinculado a la organización

### Flujo 3 — Crear lead (oportunidad comercial)

1. Usuario va a **Pipeline** → botón "Nuevo Lead" (FAB inferior derecho o encabezado)
2. Abre drawer con formulario de creación:
   - **Organización**: dropdown de organizaciones existentes
   - **Contacto**: dropdown filtrado — solo muestra contactos de la organización seleccionada
   - **Servicio de interés**: texto libre (ej. "Formulación proyecto CONCYTEC")
   - **Canal**: Referido, LinkedIn, Evento, Web, Redes sociales, etc.
   - **Encargado**: quién de BioActiva lleva el lead
   - **Estado inicial**: por defecto `en_prospecto`
   - **Comentarios internos**: notas iniciales
3. Guarda → lead aparece en la columna "En prospecto" del kanban

### Flujo 4 — Gestionar lead en pipeline (Kanban)

El pipeline es un tablero kanban con 4 columnas correspondientes a los estados:

```
En prospecto → Ofertado → Cierre con venta
                        ↘ Cierre sin venta
```

Acciones disponibles:
- **Drag & drop**: arrastra tarjeta entre columnas para cambiar estado
- **Clic en tarjeta**: abre panel lateral con detalle completo del lead
- **Panel de lead**: permite editar datos, ver historial, añadir actividades

### Flujo 5 — Registrar actividad en un lead

1. Desde panel lateral del lead en Pipeline
2. Sección "Actividades" muestra cronología existente con estado visual:
   - Verde = realizada
   - Naranja = vencida (fecha pasada, no marcada)
   - Gris = pendiente
3. Botón "Nueva actividad": tipo (reunión/llamada/email/otro), fecha, nota, responsable
4. Al guardar, el sistema sincroniza automáticamente `proximaActividad` del lead con la siguiente actividad pendiente no realizada
5. Cualquier actividad puede marcarse como realizada/pendiente desde el panel

### Flujo 6 — Crear cotización

1. Usuario va a **Cotizaciones** → "Nueva Cotización"
2. Abre drawer con formulario:
   - **Autocompletar desde lead** (dropdown): al seleccionar un lead existente, autocompleta automáticamente cliente (razón social de la org), dirigido a (nombre del contacto con vocativo), y servicio de interés
   - O busca manualmente por RUC via SUNAT para completar razón social
3. Campos adicionales: producto, monto, moneda (PEN/USD), estado, remitente, observación, link propuesta, fecha
4. Guarda → aparece en tabla con todos los campos del Excel original

### Flujo 7 — Ver cotizaciones de una organización

Desde la página de **Organizaciones**, al seleccionar/abrir una organización, hay una sección "Historial de Cotizaciones" que muestra todas las cotizaciones vinculadas a esa empresa (filtrando por los leads de esa org). Muestra: estado, monto, fecha, dirigido a, remitente.

### Flujo 8 — Consultar SUNAT (validador independiente)

Componente `ValidadorSunat` disponible como drawer independiente. Permite:
- **Modo RUC**: ingresa RUC de 11 dígitos → muestra todos los campos crudos devueltos por SUNAT
- **Modo Razón Social**: escribe nombre → dropdown con resultados → seleccionar uno → ver detalle completo

### Flujo 9 — Carga masiva desde Excel

1. Usuario va a **Importar / Exportar**
2. Arrastra o selecciona archivo `.xlsx`
3. Sistema:
   - Parsea con SheetJS
   - Normaliza nombres de columnas (tolerante a los nombres exactos del Excel de BioActiva)
   - Extrae organizaciones (de columna `Cliente`), contactos (de `Dirigido a`), leads y cotizaciones
4. Muestra preview con detección de duplicados:
   - **Duplicado exacto**: mismo RUC o mismo correo → marcado para omitir por defecto
   - **Similar**: nombre con ≥85% de similitud (Dice coefficient) → usuario decide
5. Usuario marca/desmarca qué omitir
6. Confirma → envía a `/api/bulk-import`

Columnas reconocidas del Excel:

| Columna en Excel | Campo interno |
|---|---|
| Año | anio |
| Mes | mes |
| ID de lead | idLead |
| # Cotización | idCotizacion |
| Dirigido a | dirigidoA |
| Fecha de cotización | fechaCotizacion |
| Cliente | cliente |
| Producto | producto |
| Nombre del servicio | nombreServicio |
| Monto | monto |
| Moneda | moneda |
| Estado del proceso | estadoProceso |
| Remitente | remitente |
| Observación | observacion |
| Link de propuesta | linkPropuesta |

---

## Integración SUNAT

### Por qué existe esta arquitectura

SUNAT no tiene API pública. Toda consulta pasa por un portal web con captcha visual desactivado para RUC pero con iframe. Playwright automatiza Chromium en servidor para scraping. No puede correr en el navegador del usuario — va en Python separado.

### Arquitectura en 3 capas

```
Navegador (React)
    ↓ fetch a ruta relativa (no expone el servicio Python)
Next.js API Route
    /api/search-document  →  GET http://127.0.0.1:8000/consultar-ruc?ruc=...
    /api/search-nombre    →  GET http://127.0.0.1:8000/consultar-nombre?nombre=...
    ↓
FastAPI Python (localhost:8000)
    ↓ Playwright headless Chromium
Portal SUNAT
    e-consultaruc.sunat.gob.pe
```

### Endpoints del servicio Python

**`GET /consultar-ruc?ruc=20601234567`**
Devuelve:
```json
{
  "ruc": "20601234567",
  "nombre": "ALTOMAYO S.A.C.",
  "nombreCompleto": "INDUSTRIAS MAYO S.A.C.",
  "estado": "ACTIVO",
  "condicion": "HABIDO",
  "ubicacion": "AV. JAVIER PRADO...",
  "actividades": "ELABORACION DE CAFE...",
  "_raw": { ... todos los campos crudos de SUNAT ... }
}
```

**`GET /consultar-nombre?nombre=bioactiva`**
Devuelve array:
```json
[
  { "ruc": "20601234567", "nombre": "BIOACTIVA SAC", "ubicacion": "LIMA", "estado": "ACTIVO" },
  ...
]
```
Máximo 20 resultados. La búsqueda por nombre usa los selectores de texto nativos de Playwright (`get_by_text`, `get_by_role`) porque los IDs del portal cambian.

### Iniciar el servicio SUNAT

```bash
cd sunat_service
pip install -r requirements.txt
playwright install chromium
python main.py
```

Corre en `http://127.0.0.1:8000`. Requiere Python 3.12 (Python 3.13 tuvo incompatibilidad con greenlet — resuelto con `greenlet>=3.0.0`).

---

## Variables de entorno

Archivo `.env.local` en raíz:

```env
NEXT_PUBLIC_DEMO_EMAIL=admin@bioactiva.pe
NEXT_PUBLIC_DEMO_PASSWORD=bioactiva2024
SUNAT_SERVICE_URL=http://127.0.0.1:8000
```

---

## Iniciar el frontend

```bash
npm install
npm run dev
```

Abre en `http://localhost:3000`.

---

## Valores de negocio (alineados al Excel original)

### Vocativos
`Sr.` / `Sra.` / `Srta.`

### Tamaño de organización
`Grande` / `Mediano` / `Pequeño` / `Micro`

### Tipo de organización
Academia · Empresa internacional · Empresa nacional · Gobierno nacional · Independiente · ONG · Organismo internacional

### Sectores (27)
Agricultura · Pesca y Minería · Biotecnología · Comercio · Construcción · Consultoría y Servicios Profesionales · Cultura y Arte · Educación · Energía · Finanzas y Seguros · Industria Manufacturera · Industria Textil y Confecciones · Infraestructura y Transporte · Logística y Cadena de Suministro · Medio Ambiente y Sostenibilidad · Minería y Recursos Naturales · Organizaciones sin fines de lucro · Salud y Farmacéutica · Sector Público y Gobierno · Seguridad y Defensa · Tecnología e Innovación · Telecomunicaciones · Turismo y Hospitalidad · Agroindustria / Café · Agroindustria / Cacao · Agtech / Tecnología Agrícola · Gobierno Local

### Departamentos (25 del Perú)
Amazonas · Áncash · Apurímac · Arequipa · Ayacucho · Cajamarca · Callao · Cusco · Huancavelica · Huánuco · Ica · Junín · La Libertad · Lambayeque · Lima · Loreto · Madre de Dios · Moquegua · Pasco · Piura · Puno · San Martín · Tacna · Tumbes · Ucayali

---

## Componentes reutilizables clave

### DataTable
`src/components/ui/DataTable.tsx`
Tabla genérica con:
- Búsqueda client-side sobre todos los campos
- `extraSearchFields` para buscar también en datos relacionados (nombre de org, contacto, etc.)
- Ordenamiento por columna (asc/desc)
- Paginación con ellipsis para tablas grandes
- Contador de resultados filtrados
- Botón exportar CSV

### SunatInput
`src/components/ui/SunatInput.tsx`
Input de RUC que:
- Dispara consulta automáticamente al completar 11 dígitos
- Muestra estado: cargando / encontrado / no encontrado / error
- Devuelve datos normalizados via callback `onSuccess(data: SunatData)`

### ValidadorSunat
`src/components/ui/ValidadorSunat.tsx`
Drawer de consulta SUNAT completo con toggle de modo:
- **Por RUC**: input directo, muestra todos los campos crudos de SUNAT en tabla
- **Por Razón Social**: input con debounce 500ms, dropdown de resultados, al seleccionar dispara consulta por RUC para datos completos
- Se resetea completamente al cerrar

### LeadPanel
`src/components/pipeline/LeadPanel.tsx`
Panel lateral de detalle del lead con:
- Datos del lead, organización y contacto
- Historial de actividades con estado visual (realizada / vencida / pendiente)
- Formulario para añadir nuevas actividades
- Botones para marcar actividades como realizadas/pendientes
- Sincronización automática de `proximaActividad` del lead

---

## Historial de desarrollo

### Base inicial — primer commit

- Scaffold Next.js 15 con Tailwind
- Estructura de carpetas, tipos CRM, datos mock
- Páginas base: Dashboard, Organizaciones, Contactos, Pipeline, Cotizaciones
- Componentes: DataTable, Sidebar, Drawer, Toast, SunatInput (solo RUC)
- Integración SUNAT por RUC (servicio Python básico)

### 28/04/2026 — Primera tanda (commit c705140)

- **Estados de lead** alineados al Excel: reemplaza los estados técnicos anteriores por `en_prospecto`, `ofertado`, `cierre_con_venta`, `cierre_sin_venta`
- **Página de Cotizaciones** reescrita: todos los campos del Excel (año, mes, ID lead, dirigido a, cliente, producto, nombre del servicio, monto, moneda, estado, remitente, observación, link), autocompletado desde lead seleccionado, integración SUNAT por RUC
- **Búsqueda SUNAT por razón social** implementada de extremo a extremo:
  - `sunat_service/main.py` — scraper `scrape_by_nombre` con selectores correctos de Playwright
  - `app/api/search-nombre/route.ts` — proxy Next.js
  - Formulario de organización — toggle RUC/Razón Social con dropdown de resultados
- `src/lib/constants.ts` — todos los enums del negocio centralizados
- `src/lib/excel-mapper.ts` — tipos `OrganizationImport`, `ContactImport`, `ProcessedData` + función `processExcelData()`
- Dashboard actualizado para 4 estados de lead

### 28/04/2026 — Segunda tanda (commit d2f1e61)

- **Formulario de creación de leads** en Pipeline (drawer completo):
  - Selector de organización → filtra contactos de esa org → selección de contacto
  - Servicio de interés, canal, encargado, comentarios, estado inicial
- **Gestión de actividades** en LeadPanel:
  - Campo `estado: 'pendiente' | 'realizada'` en Activity
  - Campo `fechaCompletada?` al marcar como realizada
  - Botones marcar realizada/pendiente en cada actividad
  - Estado derivado automáticamente (vencida si fecha pasada y no realizada)
- **`src/lib/activityStatus.ts`** — utilidades: `getActivityStatus()`, `getNextPendingActivity()`, `syncLeadNextActivity()`
- **Historial de cotizaciones en Organizaciones**: sección que muestra todas las quotes de esa org (filtrando leads asociados)
- Dashboard: muestra estado de actividades recientes
- Sidebar: "Carga Masiva" renombrado a "Importar / Exportar"

### 28/04/2026 — Tercera tanda (commit df8eeee)

- **ValidadorSunat** mejorado con modo dual:
  - Toggle visual "Por RUC" / "Por Razón Social"
  - Modo razón social: debounce 500ms, dropdown de coincidencias SUNAT, al seleccionar dispara búsqueda por RUC para completar datos completos
  - Reset completo de estado al cerrar el drawer (`useEffect` en `isOpen`)

### 03/05/2026 — Cuarta tanda (Integración Microsoft & Roles)

- **Gestión de Roles (Administrador vs Trabajador)**:
  - Separación explícita de permisos según el rol del usuario.
  - Los usuarios con rol `Administrador` tienen acceso completo, incluyendo la gestión de usuarios (`/users`).
  - Los usuarios con rol `Trabajador` tienen acceso operativo, excluyendo el acceso a la administración de usuarios.
- **Integración con Microsoft Teams**:
  - Implementación de `@azure/msal-browser` para autenticación OAuth con cuentas corporativas Microsoft.
  - Opción de conectar/desconectar cuenta Microsoft desde el perfil del usuario.
  - Creación automática de reuniones de Teams para las actividades programadas en el LeadPanel.
- **Mejoras generales**:
  - Optimización de la experiencia de usuario con carga de perfil y estado persistente en localStorage/sessionStorage.

### 08/05/2026 — rama implementacion_joel (commit f129d4b)

- **Sidebar**: ítem "Entidades" renombrado a "Organizaciones"
- **DataTable**: botón "Exportar CSV" oculto cuando no se pasa prop `onExport` (antes aparecía deshabilitado en todas las tablas)
- **Importar / Exportar** (`bulk-upload`):
  - Soporte de archivos `.csv` agregado (además de `.xlsx` y `.xls`)
  - Modal de confirmación antes de ejecutar la importación: muestra resumen de organizaciones, contactos, leads y cotizaciones a importar
- **Formularios de creación convertidos de drawer lateral a pestaña inline** en todos los módulos:
  - **Organizaciones**: tabs `Organizaciones | + Nueva Organización`
  - **Contactos**: tabs `Contactos | + Nuevo Contacto`; corregida label duplicada de "Organización" en el OrgTypeahead
  - **Pipeline**: tabs `Pipeline | + Nuevo Lead`; botón "+ Nuevo Lead" con fondo verde
  - **Cotizaciones**: tabs `Cotizaciones | + Nueva Cotización`; KPIs y tabla solo visibles en pestaña lista
  - Cada formulario muestra botón "Volver a..." en lugar de "Cancelar"
  - Los drawers de **detalle** (perfil de contacto, detalle de organización, panel de lead, Validador SUNAT) se mantienen sin cambios

---

## Estado actual del sistema

El frontend corre con datos mock (`src/lib/mockData.ts`). Las operaciones CRUD modifican estado local en React — no hay base de datos persistente todavía. La única integración real con servicio externo es SUNAT (requiere el servicio Python corriendo en puerto 8000).

Los endpoints API (`/api/leads/[id]`, `/api/bulk-import`) están esqueletizados — retornan respuestas simuladas. El siguiente paso natural es conectar a Supabase o similar para persistencia real.
