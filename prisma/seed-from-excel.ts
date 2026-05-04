/**
 * Migración del Excel de BioActiva a la DB.
 *
 * Lee `CRM BIACTIVA.xlsx` (la ruta puede sobrescribirse con la variable
 * EXCEL_PATH) y siembra la DB respetando FKs:
 *   1. Organizaciones
 *   2. Contactos (por org abreviada)
 *   3. Leads (por org + contacto)
 *   4. Cotizaciones (por lead)
 *   5. Activities sintéticas para leads abiertos
 *
 * Idempotente: usa upsert por `codigo`, así se puede correr más de una vez
 * sin duplicar.
 *
 * Uso:
 *   npx tsx prisma/seed-from-excel.ts            # migración real
 *   npx tsx prisma/seed-from-excel.ts --dry-run  # sin escribir, solo reporte
 */

import * as path from 'node:path';
import * as XLSX from 'xlsx';
import { PrismaClient, type EstadoLead, type EstadoCotizacion, type Moneda } from '@prisma/client';

import {
  ESTADO_LEAD_FROM_EXCEL,
  ESTADO_COTIZACION_FROM_EXCEL,
} from '../src/lib/constants';

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

/**
 * El Excel original vive fuera del repo, en la carpeta padre de
 * `ANTIGRAVITY PROJECTS`. Desde el worktree (4 niveles dentro de ese repo
 * principal) hay que subir 4 niveles para alcanzarlo.
 *
 * Override con: EXCEL_PATH=ruta/al/archivo.xlsx
 */
const DEFAULT_EXCEL_NAME = 'CRM BIACTIVA.xlsx';
const EXCEL_PATH =
  process.env.EXCEL_PATH ??
  path.resolve(process.cwd(), '..', '..', '..', '..', DEFAULT_EXCEL_NAME);

// ─── Helpers de parsing ───────────────────────────────────────────

const PLACEHOLDERS = new Set([
  'buscar contacto',
  'ingrese ruc',
  'contacto activo',
]);

function isPlaceholder(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return PLACEHOLDERS.has(value.trim().toLowerCase());
}

function trimOrUndef(value: unknown): string | undefined {
  if (typeof value !== 'string') return value == null ? undefined : String(value);
  const trimmed = value.trim();
  if (!trimmed || isPlaceholder(trimmed)) return undefined;
  return trimmed;
}

function parseDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(value);
    if (!d) return undefined;
    return new Date(Date.UTC(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, Math.floor(d.S || 0)));
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
}

function parseNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    // Excel con `raw: false` devuelve "12,500.00". Quita separador de miles
    // (coma) y espacios; conserva el punto decimal.
    const cleaned = value.replace(/[,\s]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function parseInt2(value: unknown, fallback: number): number {
  return parseNumber(value) ?? fallback;
}

function parseAlianzas(value: unknown): string[] {
  const s = trimOrUndef(value);
  if (!s) return [];
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

function parseContactoVigente(value: unknown): boolean | undefined {
  const s = trimOrUndef(value);
  if (!s) return undefined;
  return s.toLowerCase() !== 'buscar contacto';
}

function parseAlertaManual(value: unknown): boolean | undefined {
  const s = trimOrUndef(value);
  if (!s) return undefined;
  const v = s.toLowerCase();
  if (v === 'sí' || v === 'si') return true;
  if (v === 'no') return false;
  return undefined;
}

function padCorrelativo(n: number, width = 3): string {
  return String(n).padStart(width, '0');
}

// ─── Tipos de fila ─────────────────────────────────────────────────

type OrgRow = {
  'N°'?: number;
  'Organización'?: string;
  'Nombre completo'?: string;
  'RUC'?: string | number;
  'Contacto vigente'?: string;
  'Tipo de organización'?: string;
  'Tamaño'?: string;
  'Sector'?: string;
  'Alianzas'?: string;
  'Actividades'?: string;
  'Departamento'?: string;
  'LinkedIn'?: string;
};

type ContactRow = {
  'N°'?: number;
  'Código individual'?: string;
  'Vocativo'?: string;
  'Nombre'?: string;
  'Apellidos'?: string;
  'Organización abreviado'?: string;
  'Correo electrónico 1'?: string;
  'Correo electrónico 2'?: string;
  'Teléfono'?: string | number;
  'Cargo'?: string;
  'Comentarios'?: string;
};

type LeadRow = {
  'N°'?: number;
  'Año'?: number;
  'ID Lead'?: string;
  'RUC // ID Contacto'?: string; // contiene "ID00001"
  'Organización'?: string;
  'Estado'?: string;
  'Fecha de creación'?: Date | number | string;
  'Servicio de interés'?: string;
  'Comentarios'?: string;
  'Desafío u oportunidad'?: string;
  'Historial de contacto'?: string;
  'Encargado'?: string;
  'Canal de captación'?: string;
  'Próxima actividad'?: string;
  'Fecha de próxima actividad'?: Date | number | string;
  'Alerta actividad'?: string;
  'Fecha de Cierre'?: Date | number | string;
};

type QuoteRow = {
  'N°'?: number;
  'Año'?: number;
  'Mes'?: string;
  'ID de lead'?: string;
  '# Cotización'?: string;
  'Dirigido a'?: string;
  'Fecha de cotización'?: Date | number | string;
  'Cliente'?: string;
  'Producto'?: string;
  'Nombre del servicio'?: string;
  'Monto'?: number;
  'Moneda'?: string;
  'Estado del proceso'?: string;
  'Remitente'?: string;
  'Observación'?: string;
  'Link de propuesta'?: string;
};

// ─── Lectura del Excel ─────────────────────────────────────────────

function readSheet<T>(wb: XLSX.WorkBook, name: string): T[] {
  const sheet = wb.Sheets[name];
  if (!sheet) throw new Error(`Hoja "${name}" no existe en el archivo`);
  return XLSX.utils.sheet_to_json<T>(sheet, { defval: undefined, raw: false });
}

// ─── Migración ─────────────────────────────────────────────────────

async function main() {
  console.log(`📂 Leyendo: ${EXCEL_PATH}`);
  const wb = XLSX.readFile(EXCEL_PATH, { cellDates: true });

  const orgRows      = readSheet<OrgRow>(wb, 'Organizaciones');
  const contactRows  = readSheet<ContactRow>(wb, 'Contactos');
  const leadRows     = readSheet<LeadRow>(wb, 'Leads');
  const quoteRows    = readSheet<QuoteRow>(wb, 'Cotizaciones');

  const stats = {
    orgs:      { read: orgRows.length,     imported: 0, skipped: 0 },
    contacts:  { read: contactRows.length, imported: 0, skipped: 0 },
    leads:     { read: leadRows.length,    imported: 0, skipped: 0 },
    quotes:    { read: quoteRows.length,   imported: 0, skipped: 0 },
    activities:                                  { synth: 0 },
  };

  if (DRY_RUN) console.log('⚠️  DRY RUN — no se escribirá en la DB\n');

  // ─── 1. Organizaciones ──────────────────────────────────────────
  const orgIdByNombreAbreviado = new Map<string, string>();

  for (const row of orgRows) {
    const numero = row['N°'];
    const nombre = trimOrUndef(row['Organización']);
    if (!numero || !nombre) {
      stats.orgs.skipped++;
      continue;
    }

    const codigo = `ORG-2025-${padCorrelativo(numero)}`;
    const ruc    = trimOrUndef(row['RUC']);

    const data = {
      codigo,
      ruc:             ruc ?? null,
      nombre,
      nombreCompleto:  trimOrUndef(row['Nombre completo']) ?? null,
      tipo:            trimOrUndef(row['Tipo de organización']) ?? null,
      tamano:          trimOrUndef(row['Tamaño']) ?? null,
      sector:          trimOrUndef(row['Sector']) ?? null,
      ubicacion:       trimOrUndef(row['Departamento']) ?? null,
      linkedin:        trimOrUndef(row['LinkedIn']) ?? null,
      alianzas:        parseAlianzas(row['Alianzas']),
      actividades:     trimOrUndef(row['Actividades']) ?? null,
      contactoVigente: parseContactoVigente(row['Contacto vigente']) ?? true,
    };

    if (!DRY_RUN) {
      const upserted = await prisma.organization.upsert({
        where:  { codigo },
        update: data,
        create: data,
      });
      orgIdByNombreAbreviado.set(nombre.toLowerCase(), upserted.id);
    } else {
      orgIdByNombreAbreviado.set(nombre.toLowerCase(), `dry-${codigo}`);
    }
    stats.orgs.imported++;
  }

  console.log(
    `✓ Organizaciones: ${stats.orgs.imported} importadas, ${stats.orgs.skipped} omitidas (placeholders/vacías)`,
  );

  // ─── 2. Contactos ───────────────────────────────────────────────
  const contactIdByCodigoExcel = new Map<string, string>();

  for (const row of contactRows) {
    const codigoExcel = trimOrUndef(row['Código individual']);
    const nombres     = trimOrUndef(row['Nombre']);
    const apellidos   = trimOrUndef(row['Apellidos']);
    const orgAbr      = trimOrUndef(row['Organización abreviado']);

    if (!codigoExcel || !nombres || !apellidos || !orgAbr) {
      stats.contacts.skipped++;
      continue;
    }

    const orgId = orgIdByNombreAbreviado.get(orgAbr.toLowerCase());
    if (!orgId) {
      console.warn(`  ⚠️  Contacto "${codigoExcel}" sin org "${orgAbr}", omitido`);
      stats.contacts.skipped++;
      continue;
    }

    const data = {
      codigo:         codigoExcel,
      vocativo:       trimOrUndef(row['Vocativo']) ?? null,
      nombres,
      apellidos,
      correo1:        trimOrUndef(row['Correo electrónico 1']) ?? null,
      correo2:        trimOrUndef(row['Correo electrónico 2']) ?? null,
      telefono:       trimOrUndef(row['Teléfono']) ?? null,
      cargo:          trimOrUndef(row['Cargo']) ?? null,
      comentarios:    trimOrUndef(row['Comentarios']) ?? null,
      organizacionId: orgId,
    };

    if (!DRY_RUN) {
      const upserted = await prisma.contact.upsert({
        where:  { codigo: codigoExcel },
        update: data,
        create: data,
      });
      contactIdByCodigoExcel.set(codigoExcel, upserted.id);
    } else {
      contactIdByCodigoExcel.set(codigoExcel, `dry-${codigoExcel}`);
    }
    stats.contacts.imported++;
  }

  console.log(
    `✓ Contactos: ${stats.contacts.imported} importados, ${stats.contacts.skipped} omitidos`,
  );

  // ─── 3. Leads ───────────────────────────────────────────────────
  const leadIdByCodigo = new Map<string, string>();
  const leadEstados = new Map<string, EstadoLead>(); // para activities

  for (const row of leadRows) {
    const codigo  = trimOrUndef(row['ID Lead']);
    const orgAbr  = trimOrUndef(row['Organización']);
    const contactoExcelId = trimOrUndef(row['RUC // ID Contacto']);
    const estadoExcel = trimOrUndef(row['Estado']);

    if (!codigo || !orgAbr || !contactoExcelId || !estadoExcel) {
      stats.leads.skipped++;
      continue;
    }

    const orgId = orgIdByNombreAbreviado.get(orgAbr.toLowerCase());
    const contactoId = contactIdByCodigoExcel.get(contactoExcelId);
    if (!orgId || !contactoId) {
      console.warn(
        `  ⚠️  Lead "${codigo}" sin FK (org=${!!orgId}, contacto=${!!contactoId}), omitido`,
      );
      stats.leads.skipped++;
      continue;
    }

    const estado = ESTADO_LEAD_FROM_EXCEL[estadoExcel] ?? 'nuevo';

    const data = {
      codigo,
      anio:               parseInt2(row['Año'], new Date().getFullYear()),
      estado:             estado as EstadoLead,
      servicioInteres:    trimOrUndef(row['Servicio de interés']) ?? null,
      comentarios:        trimOrUndef(row['Comentarios']) ?? null,
      desafioOportunidad: trimOrUndef(row['Desafío u oportunidad']) ?? null,
      canal:              trimOrUndef(row['Canal de captación']) ?? null,
      encargado:          trimOrUndef(row['Encargado']) ?? null,
      proximaActividad:   trimOrUndef(row['Próxima actividad']) ?? null,
      fechaProximaActividad: parseDate(row['Fecha de próxima actividad']) ?? null,
      alertaManual:       parseAlertaManual(row['Alerta actividad']) ?? null,
      fechaCierre:        parseDate(row['Fecha de Cierre']) ?? null,
      historialTexto:     trimOrUndef(row['Historial de contacto']) ?? null,
      organizacionId:     orgId,
      contactoId,
    };

    if (!DRY_RUN) {
      const upserted = await prisma.lead.upsert({
        where:  { codigo },
        update: data,
        create: data,
      });
      leadIdByCodigo.set(codigo, upserted.id);
      leadEstados.set(upserted.id, estado as EstadoLead);
    } else {
      leadIdByCodigo.set(codigo, `dry-${codigo}`);
      leadEstados.set(`dry-${codigo}`, estado as EstadoLead);
    }
    stats.leads.imported++;
  }

  console.log(
    `✓ Leads: ${stats.leads.imported} importados, ${stats.leads.skipped} omitidos`,
  );

  // ─── 4. Cotizaciones ────────────────────────────────────────────
  for (const row of quoteRows) {
    const codigo  = trimOrUndef(row['# Cotización']);
    const leadCod = trimOrUndef(row['ID de lead']);
    const monto   = parseNumber(row['Monto']);
    const estadoExcel = trimOrUndef(row['Estado del proceso']);

    if (!codigo || !leadCod || monto == null || !estadoExcel) {
      console.warn(`  ⚠️  Cotización omitida — codigo:${codigo} leadCod:${leadCod} monto:${monto} estado:${estadoExcel}`);
      stats.quotes.skipped++;
      continue;
    }

    const leadId = leadIdByCodigo.get(leadCod);
    if (!leadId) {
      console.warn(`  ⚠️  Cotización "${codigo}" sin lead "${leadCod}", omitida`);
      stats.quotes.skipped++;
      continue;
    }

    const fechaCotizacion = parseDate(row['Fecha de cotización']) ?? new Date();
    const monedaRaw = trimOrUndef(row['Moneda'])?.toUpperCase() ?? 'PEN';
    const moneda: Moneda = monedaRaw === 'USD' ? 'USD' : 'PEN';
    const estado = (ESTADO_COTIZACION_FROM_EXCEL[estadoExcel] ?? 'pendiente') as EstadoCotizacion;

    const data = {
      codigo,
      anio:            parseInt2(row['Año'], fechaCotizacion.getFullYear()),
      mes:             trimOrUndef(row['Mes']) ?? '',
      dirigidoA:       trimOrUndef(row['Dirigido a']) ?? '',
      fechaCotizacion,
      cliente:         trimOrUndef(row['Cliente']) ?? '',
      producto:        trimOrUndef(row['Producto']) ?? null,
      servicio:        trimOrUndef(row['Nombre del servicio']) ?? '',
      monto,
      moneda,
      estado,
      remitente:       trimOrUndef(row['Remitente']) ?? '',
      observacion:     trimOrUndef(row['Observación']) ?? null,
      linkPropuesta:   trimOrUndef(row['Link de propuesta']) ?? null,
      leadId,
    };

    if (!DRY_RUN) {
      await prisma.quote.upsert({
        where:  { codigo },
        update: data,
        create: data,
      });
    }
    stats.quotes.imported++;
  }

  console.log(
    `✓ Cotizaciones: ${stats.quotes.imported} importadas, ${stats.quotes.skipped} omitidas`,
  );

  // ─── 5. Activities sintéticas para leads abiertos ───────────────
  for (const [codigo, leadId] of leadIdByCodigo) {
    const row = leadRows.find((r) => trimOrUndef(r['ID Lead']) === codigo);
    if (!row) continue;

    const estado = leadEstados.get(leadId);
    const isOpen = estado === 'nuevo' || estado === 'en_proceso';
    if (!isOpen) continue;

    const proxima = trimOrUndef(row['Próxima actividad']);
    const fecha   = parseDate(row['Fecha de próxima actividad']);
    if (!proxima || !fecha) continue;

    const responsable = trimOrUndef(row['Encargado']) ?? 'Equipo BioActiva';

    if (!DRY_RUN) {
      // Una sola activity sintética por lead — buscamos por leadId+nota
      const existing = await prisma.activity.findFirst({
        where: { leadId, nota: proxima },
      });
      if (!existing) {
        await prisma.activity.create({
          data: {
            tipo:        'otro',
            estado:      'pendiente',
            nota:        proxima,
            responsable,
            fecha,
            leadId,
          },
        });
      }
    }
    stats.activities.synth++;
  }

  console.log(`✓ Activities sintéticas: ${stats.activities.synth} creadas`);

  console.log('\n📊 Resumen final');
  console.table(stats);

  if (DRY_RUN) {
    console.log('\nNada fue escrito (--dry-run). Quita el flag para aplicar la migración.');
  } else {
    console.log('\n✅ Migración completa. Abre `npx prisma studio` para revisar.');
  }
}

main()
  .catch((err) => {
    console.error('❌ Error en la migración:');
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
