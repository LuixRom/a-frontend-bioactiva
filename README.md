# CRM Interno BioActiva

---

## ¿Qué es este proyecto?

CRM web interno para BioActiva, construido para reemplazar el Excel con macros que usan actualmente para gestionar su proceso comercial. El sistema centraliza organizaciones, contactos, leads y cotizaciones en una interfaz moderna con pipeline visual, búsqueda SUNAT, y carga masiva desde Excel.

---

## Por qué se desarrolla

BioActiva gestiona todo su proceso comercial en un Excel con macros. Eso genera:

- registro manual y repetitivo
- duplicidad de datos entre hojas
- sin historial estructurado de interacciones
- sin indicadores ni métricas
- problemas de co-edición simultánea

---

## Flujo comercial del sistema

```
Organización → Contacto → Lead → Cotización → Cierre
```

El lead es el núcleo. Toda cotización pertenece a un lead. Todo lead pertenece a un contacto dentro de una organización.

### Estados de un lead

| Estado | Significado |
|---|---|
| `en_prospecto` | Lead identificado, aún sin propuesta |
| `ofertado` | Se envió cotización |
| `cierre_con_venta` | Venta cerrada exitosamente |
| `cierre_sin_venta` | Lead cerrado sin venta |

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS |
| Tipos | TypeScript |
| Scraping SUNAT | Python 3.12+, FastAPI, Playwright |
| Íconos | Lucide React |
| Excel parsing | SheetJS (xlsx) |
| Fuzzy matching | string-similarity |

---

## Estructura del proyecto

```
a-frontend-bioactiva/
├── app/                        # Páginas Next.js (App Router)
│   ├── page.tsx                # Dashboard con métricas
│   ├── organizations/page.tsx  # CRUD organizaciones + búsqueda SUNAT
│   ├── contacts/page.tsx       # CRUD contactos
│   ├── pipeline/page.tsx       # Kanban de leads por estado
│   ├── quotes/page.tsx         # Cotizaciones (tabla completa)
│   ├── bulk-upload/page.tsx    # Carga masiva desde Excel
│   ├── search/page.tsx         # Búsqueda global
│   ├── notifications/page.tsx  # Centro de notificaciones
│   ├── events/page.tsx         # Calendario de actividades
│   ├── users/page.tsx          # Gestión de usuarios
│   └── api/
│       ├── search-document/    # Proxy → SUNAT por RUC
│       └── search-nombre/      # Proxy → SUNAT por razón social
│
├── src/
│   ├── types/crm.ts            # Tipos centrales: Organization, Contact, Lead, Quote
│   ├── lib/
│   │   ├── constants.ts        # Enums del negocio (vocativos, sectores, departamentos…)
│   │   ├── mockData.ts         # Datos de prueba para desarrollo
│   │   ├── excel-mapper.ts     # Tipos de importación + processExcelData()
│   │   ├── columnMapper.ts     # Normaliza columnas del Excel al modelo CRM
│   │   ├── deduplication.ts    # Detección de duplicados (exacto y por similaridad)
│   │   ├── exportCsv.ts        # Exportar tablas a CSV
│   │   └── utils.ts            # cn() y helpers
│   └── components/
│       ├── ui/
│       │   ├── DataTable.tsx   # Tabla genérica con búsqueda, orden y paginación
│       │   ├── SunatInput.tsx  # Input con consulta automática SUNAT por RUC
│       │   └── Toast.tsx       # Sistema de notificaciones toast
│       └── pipeline/
│           └── LeadPanel.tsx   # Tarjeta de lead para el kanban
│
└── sunat_service/              # Microservicio Python separado
    ├── main.py                 # FastAPI + Playwright scraper
    └── requirements.txt
```

---

## Modelo de datos

### Organization
```typescript
{
  id: string          // "ORG-2025-001"
  ruc?: string
  nombre: string
  nombreCompleto?: string
  tipo?: string       // Empresa nacional, ONG, Gobierno, etc.
  tamano?: string     // Grande, Mediano, Pequeño, Micro
  sector?: string     // 27 sectores alineados al Excel
  ubicacion?: string  // Departamento
  actividades?: string
  linkedin?: string
}
```

### Contact
```typescript
{
  id: string          // "CON-2025-001"
  organizacionId: string
  vocativo?: string   // Sr., Sra., Srta.
  nombres: string
  apellidos: string
  correo1: string
  correo2?: string
  telefono?: string
  cargo?: string
}
```

### Lead
```typescript
{
  id: string          // "LEAD-2025-001"
  contactoId: string
  organizacionId: string
  estado: 'en_prospecto' | 'ofertado' | 'cierre_con_venta' | 'cierre_sin_venta'
  encargado?: string
  servicioInteres?: string
  actividades: Activity[]
}
```

### Quote
```typescript
{
  id: string          // "COT-2025-001"
  leadId: string
  anio: number
  mes: string
  dirigidoA: string
  cliente: string
  producto?: string
  servicio: string
  monto: number
  moneda: 'PEN' | 'USD'
  estado: 'enviada' | 'aceptada' | 'rechazada' | 'pendiente'
  remitente: string
  observacion?: string
  linkPropuesta?: string
}
```

---

## Integración SUNAT

La consulta a SUNAT pasa por tres capas:

```
Navegador React
    ↓ fetch
Next.js API Route (/api/search-document o /api/search-nombre)
    ↓ fetch interno
FastAPI Python (localhost:8000)
    ↓ Playwright headless Chromium
Portal SUNAT (e-consultaruc.sunat.gob.pe)
```

### Por qué esta arquitectura

SUNAT no tiene API pública. El portal tiene un iframe con scraping necesario. Playwright corre en servidor (Python), no en el navegador del usuario. Next.js actúa como proxy para no exponer la URL del servicio Python al cliente.

### Búsqueda por RUC

- Ruta: `GET /api/search-document?document=20601234567`
- Devuelve: `{ ruc, nombre, nombreCompleto, ubicacion, actividades, estado, condicion }`
- Usado en: SunatInput (campo RUC en formulario de organización)

### Búsqueda por razón social

- Ruta: `GET /api/search-nombre?nombre=bioactiva`
- Devuelve: array de `{ ruc, nombre, ubicacion, estado }`
- Usado en: dropdown de búsqueda de razón social en formulario de organización
- Al seleccionar un resultado, dispara automáticamente la búsqueda por RUC para rellenar todos los campos

### Correr el servicio SUNAT

```bash
cd sunat_service
pip install -r requirements.txt
playwright install chromium
python main.py
```

Corre en `http://127.0.0.1:8000`. Requiere Python 3.12 (no 3.13 — greenlet tuvo problemas de compilación con 3.13, resuelto usando `greenlet>=3.0.0`).

---

## Variables de entorno

Archivo `.env.local` en raíz del proyecto:

```env
NEXT_PUBLIC_DEMO_EMAIL=admin@bioactiva.pe
NEXT_PUBLIC_DEMO_PASSWORD=bioactiva2024
SUNAT_SERVICE_URL=http://127.0.0.1:8000
```

---

## Cómo correr el frontend

```bash
npm install
npm run dev
```

Abre en `http://localhost:3000`.

---

## Carga masiva desde Excel

La página `/bulk-upload` permite importar el Excel de BioActiva directamente:

1. Arrastra o selecciona el archivo `.xlsx`
2. El sistema normaliza columnas automáticamente (tolerante a nombres exactos del Excel: "Nombre del servicio", "ID de lead", etc.)
3. Muestra preview con detección de duplicados:
   - **Duplicado exacto**: mismo RUC o correo → se omite por defecto
   - **Similar**: nombre con ≥85% de similitud (Dice coefficient) → el usuario decide
4. Usuario confirma qué registros importar
5. Se envía a `/api/bulk-import`

Columnas reconocidas del Excel:

| Excel | Campo interno |
|---|---|
| Año | anio |
| Mes | mes |
| ID de lead | idLead |
| # Cotización | idCotizacion |
| Dirigido a | dirigidoA |
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

## Valores de negocio alineados al Excel

### Vocativos
`Sr.` / `Sra.` / `Srta.`

### Tamaño de organización
`Grande` / `Mediano` / `Pequeño` / `Micro`

### Tipo de organización
Academia · Empresa internacional · Empresa nacional · Gobierno nacional · Independiente · ONG · Organismo internacional

### Sectores (27)
Agricultura, Pesca y Minería · Comercio · Construcción · Educación · Energía · Industria Manufacturera · Medio Ambiente · Salud · Tecnología · Turismo · (y más)

### Departamentos (25 de Perú)
Amazonas · Áncash · Apurímac · Arequipa · Ayacucho · Cajamarca · Callao · Cusco · Huancavelica · Huánuco · Ica · Junín · La Libertad · Lambayeque · Lima · Loreto · Madre de Dios · Moquegua · Pasco · Piura · Puno · San Martín · Tacna · Tumbes · Ucayali

---

## Componentes reutilizables clave

### DataTable
`src/components/ui/DataTable.tsx` — tabla genérica con:
- búsqueda cliente-side por todos los campos
- `extraSearchFields` para buscar también en campos relacionados (nombre de organización, contacto, etc.)
- ordenamiento por columna
- paginación con ellipsis para muchas páginas
- exportar CSV

### SunatInput
`src/components/ui/SunatInput.tsx` — input de RUC que:
- consulta SUNAT automáticamente al completar 11 dígitos
- muestra estado (cargando / encontrado / no encontrado)
- devuelve datos normalizados via `onSuccess`

---

## Estado actual

El frontend corre con datos mock (`src/lib/mockData.ts`). No hay backend persistente aún — todas las operaciones CRUD modifican estado local en React. La integración real con base de datos es el siguiente paso.

La única integración real con servicio externo es SUNAT (requiere el servicio Python corriendo).
