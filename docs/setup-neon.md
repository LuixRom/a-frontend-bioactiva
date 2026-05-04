# Setup de Neon Postgres (10 minutos)

Pasos a ejecutar **una sola vez** antes del Día 2 (migración del Excel).

## 1. Crear cuenta en Neon

1. Abre https://console.neon.tech/signup
2. Inicia sesión con GitHub o Google (recomendado: la cuenta del proyecto)
3. En el primer login, Neon ofrece crear un "Project" — acepta

## 2. Crear el proyecto

| Campo | Valor |
|---|---|
| Project name | `bioactiva-crm` |
| Postgres version | `16` (default) |
| Region | `AWS US East (Ohio)` o el más cercano |
| Database name | `neondb` (default) |

Click "Create project". En segundos queda lista.

## 3. Copiar el Connection String

1. En el dashboard del proyecto, panel **"Connection Details"**
2. Selecciona **"Pooled connection"** (importante para Next.js)
3. Click en el ícono de copiar — algo como:

```
postgresql://neondb_owner:abc123XYZ@ep-cool-xyz-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## 4. Pegar en `.env`

En la raíz del proyecto edita `.env`:

```env
DATABASE_URL="postgresql://neondb_owner:abc123XYZ@ep-cool-xyz-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

## 5. Aplicar el schema

```bash
npx prisma db push
```

Salida esperada:
```
🚀  Your database is now in sync with your Prisma schema. Done in 4.2s
✔ Generated Prisma Client (vX.X.X) to .\node_modules\@prisma\client in 350ms
```

## 6. Abrir Prisma Studio (opcional)

```bash
npx prisma studio
```

Abre `http://localhost:5555` con la DB vacía. Las 5 tablas (`Organization`, `Contact`, `Lead`, `Activity`, `Quote`) deben aparecer listadas.

---

## Notas

- El plan **free tier** de Neon: 0.5 GB storage, 191.9 horas de cómputo/mes — suficiente de sobra para este MVP.
- La DB se **pone a dormir tras 5 min de inactividad** y despierta sola en ~500 ms al recibir una query. Para el demo del viernes, hacer una query unos minutos antes para tenerla "tibia".
- El `pooled connection` (con `-pooler` en el host) es el que usaremos en Next.js. La URL "directa" (sin `-pooler`) solo se usa para migrations y `prisma db push`.

## Cambios pendientes (Día 2)

- Crear `prisma/seed-from-excel.ts` que lee `CRM BIACTIVA.xlsx` y siembra la DB.
- Mapear los catálogos del Excel (`"Cerrado ganado" → "cerrado_ganado"`, etc.) — ya hay tablas literales en [src/lib/constants.ts](../src/lib/constants.ts) (`ESTADO_LEAD_FROM_EXCEL`, `ESTADO_COTIZACION_FROM_EXCEL`).
