# CRM Interno BioActiva

Sistema CRM web que reemplaza el Excel con macros que BioActiva usa para gestionar su proceso comercial. Centraliza organizaciones, contactos, leads y cotizaciones en una interfaz moderna con pipeline kanban, búsqueda SUNAT en tiempo real, integración con Microsoft 365 (Outlook + Teams) y persistencia real en Postgres.

---

## Contexto del negocio

BioActiva es una consultora peruana de proyectos de innovación (fondos CONCYTEC, Ley 30309, cadenas de valor, etc.). Su proceso comercial vivía en un Excel con macros: contactos, organizaciones, leads y cotizaciones en hojas separadas. Los problemas principales:

- Registro manual y repetitivo de datos
- Duplicidad de información entre hojas
- Sin historial estructurado de interacciones con clientes
- Sin indicadores ni métricas comerciales
- Problemas de edición simultánea (co-autoría en Excel)
- Difícil seguimiento de oportunidades abiertas

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router · Turbopack) |
| UI | React 19, Tailwind CSS 4 |
| Tipos | TypeScript 5 |
| ORM / DB | Prisma 6 + PostgreSQL (Neon serverless) |
| Auth | NextAuth + bcryptjs (login propio) + MSAL (Microsoft 365) |
| Estado cliente | Zustand 5 |
| Forms | react-hook-form 7 |
| Charts | Recharts 3 |
| Drag & drop | @hello-pangea/dnd |
| Excel parsing | SheetJS (xlsx) |
| Fuzzy matching | string-similarity (Dice coefficient) |
| Iconos | Lucide React |
| Email | Resend (preparado, post-MVP) |
| Scraping SUNAT | Python 3.12 + FastAPI + Playwright (microservicio aparte) |

---

## Modelo de datos

Persistencia real en Postgres vía Prisma. Schema en [`prisma/schema.prisma`](prisma/schema.prisma).

### Jerarquía

```
Organización ←─── Contacto (siempre vinculado a una org)
     ↑
     └─── Lead (siempre vinculado a una org · contacto OPCIONAL)
              ↓
          Activity[]   (cronología de interacciones)
              ↓
          Quote[]      (cotizaciones — pueden tener PDF imprimible)
```

Un lead puede crearse "desde cero" (sin contacto) y vincularse después. Un contacto se puede convertir en lead con un click desde la página de Contactos.

### User (nuevo, post-MVP)

Tabla real con autenticación y roles, reemplaza el `mockUsers` original.

```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  name         String
  passwordHash String              // bcrypt 10 rondas
  role         UserRole  @default(Trabajador)   // Administrador | Trabajador
  active       Boolean   @default(true)
  lastLogin    DateTime?
}
```

- Login con email/password validado contra DB
- Solo administradores pueden gestionar usuarios desde `/users`
- Cambio de contraseña con confirmación + validación de mínimo 6 caracteres

### Catálogos alineados al Excel real

Los enums del frontend ([src/lib/constants.ts](src/lib/constants.ts)) reflejan los valores literales que BioActiva usa hoy en su Excel:

| Catálogo | Valores |
|---|---|
| **Estados de lead** | `nuevo`, `en_proceso`, `cerrado_ganado`, `cerrado_perdido` |
| **Tipos de organización** | Asociación civil, Cooperativa, Empresa nacional, Empresa pública, Entidad pública, Gremio, Multinacional, Universidad pública |
| **Tamaño** | Grande, Mediana, Pequeña *(femenino — coincide con el Excel)* |
| **Sectores** | 14 valores reales del Excel (Agrícola, Innovación, Inversiones, Legal, Alimentos, …) |
| **Vocativos** | Sr., Sra., Srta., Dr., Dra. |
| **Canales** | Referido, Evento presencial, Prospección directa, Red profesional, LinkedIn, Web, Otro |

Mapas literales en `ESTADO_LEAD_FROM_EXCEL` y `ESTADO_COTIZACION_FROM_EXCEL` para importación bidireccional.

---

## Estructura del proyecto

```
a-frontend-bioactiva/
├── app/                              # App Router de Next.js
│   ├── page.tsx                      # Server: dashboard
│   ├── DashboardClient.tsx           # Cliente: KPIs financieros, gráficos
│   ├── organizations/                # Server + client split
│   ├── contacts/                     # Server + client split
│   ├── pipeline/                     # Server + client split (kanban)
│   ├── quotes/
│   │   ├── page.tsx                  # Lista de cotizaciones
│   │   └── [id]/print/               # Vista imprimible con CSS @media print
│   ├── users/                        # Gestión de usuarios (solo admin)
│   ├── search/                       # Búsqueda global server-rendered
│   ├── profile/                      # Perfil + conexión Microsoft
│   ├── notifications/                # Centro de notificaciones in-app
│   ├── events/                       # Calendario de actividades
│   └── api/
│       ├── health/                   # GET — keep-alive + diagnóstico DB
│       ├── leads/[id]/               # GET/PATCH lead · activities POST
│       ├── search-document/          # Proxy → SUNAT por RUC
│       ├── search-nombre/            # Proxy → SUNAT por razón social
│       └── notifications/            # GET notificaciones
│
├── prisma/
│   ├── schema.prisma                 # Modelo de datos (8 entidades)
│   ├── seed-from-excel.ts            # Migración del Excel a Postgres
│   ├── seed-users.ts                 # Sembrado inicial de 7 usuarios
│   ├── ping-db.ts                    # Wake-up manual de Neon
│   ├── verify-import.ts              # Verificación post-migración
│   └── check-headers.ts / check-quotes.ts  # Helpers de inspección
│
├── src/
│   ├── server/                       # Capa servidor (Server Actions)
│   │   ├── db.ts                     # PrismaClient singleton + retry $extends
│   │   ├── transformers.ts           # Prisma → tipos del frontend
│   │   └── actions/
│   │       ├── organizations.ts      # list, create, update
│   │       ├── contacts.ts           # list, create
│   │       ├── leads.ts              # list, create, updateLead, updateLeadEstado, addActivity
│   │       ├── quotes.ts             # list, create, updateQuoteEstado
│   │       └── users.ts              # list, create, update, updatePassword, verifyCredentials
│   │
│   ├── components/
│   │   ├── AppShell.tsx              # Layout + useKeepAlive
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx                # Incluye MicrosoftStatusBadge
│   │   ├── LoginPage.tsx             # Login real con bcrypt
│   │   ├── MicrosoftStatusBadge.tsx  # Estado tri-color de conexión MS
│   │   ├── ui/
│   │   │   ├── DataTable.tsx         # Tabla genérica con búsqueda + export
│   │   │   ├── SunatInput.tsx        # Input RUC + validador módulo 11 + lookup
│   │   │   ├── ValidadorSunat.tsx    # Drawer SUNAT (RUC o razón social)
│   │   │   ├── Drawer.tsx            # Drawer con prop transparentBackground
│   │   │   ├── Toast.tsx
│   │   │   └── Timeline.tsx          # Línea de tiempo de actividades
│   │   ├── pipeline/
│   │   │   ├── KanbanColumn.tsx      # memo + Maps O(1)
│   │   │   ├── KanbanCard.tsx        # memo + portal durante drag
│   │   │   ├── CloseLeadDialog.tsx   # Modal "¿Confirmar cierre?"
│   │   │   └── LeadPanel.tsx         # Panel detalle + activities + Teams
│   │   └── filters/FilterPanel.tsx
│   │
│   ├── hooks/
│   │   ├── useMsGraph.ts             # Cliente Microsoft Graph centralizado
│   │   ├── useKeepAlive.ts           # Ping a /api/health cada 4 min
│   │   └── useGlobalSearch.ts
│   │
│   ├── lib/
│   │   ├── constants.ts              # Catálogos del Excel
│   │   ├── rucValidator.ts           # Validador módulo 11 peruano
│   │   ├── activityStatus.ts         # Estado derivado de actividades
│   │   ├── alertLevel.ts             # Nivel de alerta visual
│   │   ├── deduplication.ts          # Detección de duplicados (Dice ≥85%)
│   │   ├── exportCsv.ts              # Exportar tablas a CSV
│   │   ├── calendarLink.ts           # Generadores de links de calendario
│   │   ├── columnMapper.ts           # Mapeo Excel → modelo CRM
│   │   ├── excel-mapper.ts
│   │   ├── msalConfig.ts             # Config MSAL
│   │   └── utils.ts
│   │
│   ├── store/                        # Zustand
│   │   ├── authStore.ts              # token CRM + token MS
│   │   ├── notificationStore.ts
│   │   └── usersStore.ts
│   │
│   └── types/crm.ts                  # Tipos centrales
│
└── sunat_service/                    # Microservicio Python separado
    ├── main.py                       # FastAPI + Playwright
    ├── Dockerfile
    └── flake.nix                     # Para deploy en NixOS
```

---

## Flujos principales

### Login y gestión de usuarios

1. Usuario abre la app → ve `/login`
2. Ingresa email + password → `verifyCredentials` valida contra DB con bcrypt
3. Cuentas inactivas son rechazadas con mensaje claro
4. `lastLogin` se actualiza al entrar
5. Si es Admin → ve menú `/users` con CRUD de usuarios + cambio de password de cualquiera (incluido a sí mismo)

**Credenciales por defecto** (sembradas con `prisma/seed-users.ts`):
- Email: cualquiera de los 7 (ver más abajo)
- Password: `bioactiva2024`

### Conexión con Microsoft 365 (opcional)

1. Usuario va a `/profile`
2. Click en "Conectar con Microsoft" → MSAL `loginRedirect`
3. El badge en el TopBar muestra el estado:
   - 🟢 **Conectado** · Teams + Outlook listos
   - 🟡 **Reconectar** · token expirado
   - ⚫ **Desconectado** · nunca conectó

4. Cuando hay reunión Teams (en una activity) → **una sola llamada** crea:
   - Evento en el calendario Outlook del usuario
   - Reunión Teams adjunta al evento (link Teams en la respuesta)
   - Invitación al contacto del lead (con botones Aceptar/Rechazar)

### Crear organización

1. **Organizaciones** → "Nueva Organización"
2. Drawer con formulario. Modos:
   - **Por RUC**: 11 dígitos → módulo 11 valida → SUNAT autocompleta nombre, ubicación, actividades
   - **Por Razón Social**: 3+ caracteres → debounce 500ms → dropdown de coincidencias SUNAT → click selecciona y dispara lookup completo

### Crear contacto / convertir contacto en lead

- **Contactos** → "Nuevo Contacto" → vinculado a una org existente
- Cada fila de contactos tiene un botón **✨ Convertir en lead** que abre el form de Pipeline con organización + contacto pre-seleccionados
- También en el panel de detalle del contacto

### Pipeline kanban

Tablero con 4 columnas correspondientes a los estados reales del Excel:

```
Nuevo → En proceso → Cerrado ganado
                  ↘ Cerrado perdido
```

- **Drag & drop** entre columnas con persistencia inmediata
- Al arrastrar a un estado cerrado, aparece **modal con date picker** ("¿Confirmar cierre con fecha?")
- Tarjetas con **alerta visual** cuando hay actividades vencidas o próximas (rojo/ámbar)
- Click en una tarjeta abre el panel lateral con detalle completo
- Cards usan `createPortal` durante el drag para escapar del scroll horizontal

### Crear lead "desde cero" o desde contacto

Form en `/pipeline` → "Nuevo lead":
- **Organización** obligatoria
- **Contacto** opcional (puede vincularse después)
- Servicio de interés, canal, encargado
- Estado inicial (default: `nuevo`)

### Cotización imprimible + envío

1. **Cotizaciones** → "Nueva Cotización" → autocompleta desde lead
2. Cuando lead estaba `nuevo`, al crear cotización pasa automáticamente a `en_proceso`
3. Cada cotización tiene 3 botones de acción:
   - 🖨️ **Imprimir** → `/quotes/[id]/print` con CSS print stylesheet, membrete BioActiva, A4
   - ✉️ **Enviar al cliente** → `mailto:` con destinatario + cuerpo prellenado *(post-MVP: Outlook Send Mail API con PDF adjunto)*
   - 🔗 **Link propuesta** → abre el `linkPropuesta` (Drive/etc.)

### Dashboard con KPIs

8 métricas calculadas en vivo desde la DB:

| Métrica | Cálculo |
|---|---|
| Pipeline Value | Σ cotizaciones de leads activos |
| Ganado total | Σ cotizaciones aceptadas de leads cerrados ganados |
| Tasa de cierre | `ganados / (ganados + perdidos)` |
| Ticket promedio | Σ aceptadas / N aceptadas |
| Leads activos | Conteo |
| Con alerta | Activities vencidas o próximas |
| Cotizaciones del mes | Filtradas por `fechaCotizacion` |
| Organizaciones | Total + N contactos |

Más visualizaciones:
- Bar chart de leads por etapa
- Bar chart de cotizaciones por mes (con monto)
- Top 5 organizaciones por monto cerrado
- Pie chart de distribución por sector

---

## Integración SUNAT

### Por qué este microservicio

SUNAT no tiene API pública. El portal exige scraping con captcha visual. **Playwright headless** lo automatiza desde un servicio Python aparte.

### Arquitectura

```
Browser (React)
    ↓ fetch a ruta relativa
Next.js API Route
    /api/search-document  →  GET {SUNAT_SERVICE_URL}/consultar-ruc?ruc=...
    /api/search-nombre    →  GET {SUNAT_SERVICE_URL}/consultar-nombre?nombre=...
    ↓
FastAPI Python (sunat_service/)
    ↓ Playwright headless Chromium
Portal SUNAT
```

El microservicio puede correr local (`http://127.0.0.1:8000`) o desplegado (Docker / NixOS).

### Validador RUC peruano (módulo 11)

Implementado en [`src/lib/rucValidator.ts`](src/lib/rucValidator.ts). Antes de llamar SUNAT, el frontend valida:
- 11 dígitos numéricos
- Prefijo válido (10/15/17/20/25)
- Dígito verificador correcto (algoritmo módulo 11 oficial)

Si el RUC es inválido, **no se hace el request a SUNAT** — error inmediato y claro.

---

## Resiliencia de la base de datos (Neon dormida)

Neon free tier suspende compute tras ~5 min de inactividad. La primera query después de dormir suele fallar con `P1001`/timeout. Se resolvió con 3 capas:

| Capa | Cómo funciona |
|---|---|
| **Retry automático en Prisma** ([src/server/db.ts](src/server/db.ts)) | `$extends` envuelve cada query: detecta errores transitorios (`P1001`, `P1002`, `P1008`, `P1017`) y reintenta hasta 3 veces con backoff exponencial. Transparente para las server actions |
| **`/api/health`** | Endpoint con counts + latencia. Despierta la DB si está dormida |
| **`useKeepAlive` hook** ([src/hooks/useKeepAlive.ts](src/hooks/useKeepAlive.ts)) | Activado en AppShell. Pingea `/api/health` cada 4 min mientras la app está abierta |

---

## Setup local

### 1. Variables de entorno (`.env`)

```env
# Postgres (Neon serverless free tier o cualquier Postgres)
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Microservicio SUNAT
SUNAT_SERVICE_URL="http://127.0.0.1:8000"
```

### 2. Instalación

```bash
npm install
```

### 3. DB

```bash
# Aplicar schema a la DB
npx prisma db push

# Sembrar usuarios iniciales (password 'bioactiva2024')
npx tsx prisma/seed-users.ts

# Migrar el Excel real (CRM BIACTIVA.xlsx debe estar 4 niveles arriba del repo,
# o setear EXCEL_PATH=/ruta/al/archivo.xlsx)
npm run seed:excel
# Salida: 20 orgs · 20 contactos · 10 leads · 5 cotizaciones · 5 activities sintéticas
```

### 4. SUNAT (opcional, en otra terminal)

```bash
cd sunat_service
pip install -r requirements.txt
playwright install chromium
python main.py
```

Corre en `http://127.0.0.1:8000`. También hay `Dockerfile` y `flake.nix`.

### 5. Frontend

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Login con cualquier email sembrado, password `bioactiva2024`.

---

## Microsoft 365 (opcional)

La integración con MSAL requiere registrar una app en Microsoft Entra ID (Azure portal). [`src/lib/msalConfig.ts`](src/lib/msalConfig.ts):

```ts
clientId: '...'        // App registration en Entra ID
authority: '.../{tenantId}'  // Tenant específico, o 'common' para multi-tenant
redirectUri: 'http://localhost:3000'
```

**Scopes** (`User.Read`, `Calendars.ReadWrite`, `OnlineMeetings.ReadWrite`).

⚠️ `OnlineMeetings.ReadWrite` requiere admin consent del tenant. Si no está aprobado, las llamadas devuelven `MsConsentRequiredError`.

---

## Usuarios sembrados

Todos con password inicial `bioactiva2024`:

| Email | Rol | Estado |
|---|---|---|
| `admin@bioactiva.pe` | Administrador | Activo |
| `karien@bioactiva.pe` | Trabajador | Activo |
| `arojas@bioactiva.pe` | Trabajador | Activo |
| `ltorres@bioactiva.pe` | Trabajador | Activo |
| `mquispe@bioactiva.pe` | Trabajador | Activo |
| `cmamani@bioactiva.pe` | Trabajador | Activo |
| `rcondori@bioactiva.pe` | Administrador | Inactivo |

---

## Componentes reutilizables clave

### `useMsGraph` ([src/hooks/useMsGraph.ts](src/hooks/useMsGraph.ts))

Cliente centralizado para Microsoft Graph:
- `callGraph<T>(path, init)`: fetch wrapper con auth + serialización
- `ensureToken()`: refresh silent con dedup de requests concurrentes
- `connect()` / `disconnect()`
- `status`: `'connected' | 'expired' | 'disconnected'`
- Errores tipados: `MsNotConnectedError`, `MsConsentRequiredError`, `MsGraphError`

### `SunatInput`

Input de RUC con:
- Validación módulo 11 antes del lookup
- Auto-fetch al completar 11 dígitos válidos
- Estado visual: cargando / encontrado / no encontrado / inválido
- Callback `onSuccess(data: SunatData)`

### `Drawer`

Panel lateral deslizante con prop opcional `transparentBackground` — útil para paneles de lectura (LeadPanel) donde el usuario quiere ver el dashboard mientras tiene el panel abierto.

### `KanbanCard` / `KanbanColumn`

Memoized para que el drag&drop no re-renderice durante una operación. Card usa `createPortal` durante el drag para escapar de cualquier `overflow:auto` ancestro.

### `MicrosoftStatusBadge`

Visible en TopBar en todas las páginas. Click → `/profile`. Estado tri-color sincronizado con el token MS real.

---

## Decisiones técnicas

### Server actions vs API routes

Las mutaciones nuevas usan Server Actions (`'use server'`). Los API routes existentes (`/api/leads/*`) se mantienen como adaptadores delgados que llaman a las mismas server actions, así el frontend de main (con MSAL) sigue funcionando.

### Auth: bcrypt vs MSAL

- **Login del CRM**: bcrypt (offline, controlado por BioActiva)
- **MSAL**: solo para integración con Microsoft 365 (Teams, Outlook). Es **opcional** — si el usuario no la conecta, el CRM funciona perfecto sin Teams ni Outlook real

### Catálogos como source of truth en `constants.ts`

Los enums viven en TypeScript y se reflejan en Prisma. El Excel real definió los valores, no al revés. Ej: `Tamaño` es `Mediana` (femenino) porque así estaba en el archivo.

### Migración del Excel = evento único

`prisma/seed-from-excel.ts` es **idempotente** (upsert por código) pero pensado para correr una sola vez al setear el sistema. Después, los datos viven y crecen en la DB.

---

## Estado actual

### ✅ Funcionando

- Login con bcrypt + 7 usuarios sembrados
- Las 4 entidades principales (Organizaciones, Contactos, Leads, Cotizaciones) con CRUD completo en DB real
- Pipeline kanban con drag&drop persistente (sin offset, sin bouncing)
- Validador RUC peruano (módulo 11)
- Búsqueda SUNAT por RUC y por razón social
- Cotización imprimible (CSS print A4 con membrete)
- Dashboard con 8 KPIs financieros + 4 gráficos
- Búsqueda global server-rendered
- Gestión de usuarios completa (CRUD + cambio de password)
- Healthcheck + retry automático contra Neon dormida
- Conexión Microsoft con badge de estado en TopBar
- Reunión Teams + evento Outlook + invitación al contacto en una sola llamada
- Convertir contacto en lead con un click

### 🟡 Post-MVP (siguiente iteración)

- Enviar cotización por email vía Outlook Send Mail API (con PDF adjunto)
- Encontrar disponibilidad común (`/me/findMeetingTimes`)
- Audit log por registro
- Notificaciones automáticas vía Resend (cron)
- Importador masivo continuo
- Catálogo de servicios `Service` como entidad
- Mobile responsive completo

---

## Microservicio SUNAT (resumen)

**Endpoints expuestos** (FastAPI en `sunat_service/main.py`):

- `GET /consultar-ruc?ruc=20100070970` → ficha completa de SUNAT
- `GET /consultar-nombre?nombre=alicorp` → array de coincidencias (max 20)

**Ejemplo de respuesta** (`/consultar-ruc`):

```json
{
  "ruc": "20100070970",
  "nombre": "SUPERMERCADOS PERUANOS S.A.",
  "estado": "ACTIVO",
  "condicion": "HABIDO",
  "ubicacion": "CAL.MORELLI NRO. 181 INT. P-2 LIMA - SAN BORJA",
  "actividades": "Principal - 4711 - VENTA AL POR MENOR…",
  "_raw": { /* todos los campos crudos del portal */ }
}
```

**Notas operativas:**
- Requiere Python 3.12 (3.13 tiene incompatibilidad con greenlet)
- El portal SUNAT es lento e inestable — esperar respuesta puede tardar 5-30s
- Hay rate limiting implícito si se hacen muchas requests seguidas
- El Excel original tiene RUCs ficticios (CITAGRO `20131545500`, etc.) que NO existen en SUNAT

---

## Comandos útiles

```bash
# Dev server
npm run dev

# Build
npm run build

# Typecheck (sin emitir)
npx tsc --noEmit

# Lint
npm run lint

# Prisma
npx prisma db push           # aplicar schema a DB
npx prisma studio            # visualizar/editar datos
npx prisma generate          # regenerar client TS

# Seeds
npm run seed:excel           # migrar Excel a DB
npm run seed:excel:dry       # dry-run sin escribir
npx tsx prisma/seed-users.ts # sembrar usuarios

# Diagnóstico
npx tsx prisma/ping-db.ts        # despertar Neon dormida
npx tsx prisma/verify-import.ts  # verificar conteos post-migración

# SUNAT (en otra terminal)
cd sunat_service && python main.py
```
