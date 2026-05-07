'use server';

/**
 * Server actions de leads.
 *
 * Las funciones marcadas como `async export` son llamables tanto desde
 * Server Components (lectura) como desde Client Components (mutaciones).
 */
import { revalidatePath } from 'next/cache';
import { prisma } from '@/src/server/db';
import { toLead, toActivity } from '@/src/server/transformers';
import type { Lead, Activity } from '@/src/types/crm';
import type { EstadoLead, TipoActividad, EstadoActividad } from '@/src/lib/constants';
import type { Prisma } from '@prisma/client';

// ─── Lecturas ──────────────────────────────────────────────────────

export async function listLeads(): Promise<Lead[]> {
  const rows = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      actividades: { orderBy: { fecha: 'asc' } },
      organizacion: true,
      contacto: true,
    },
  });
  return rows.map((r) => toLead(r));
}

export async function getLeadByCodigo(codigo: string): Promise<Lead | null> {
  const row = await prisma.lead.findUnique({
    where: { codigo },
    include: {
      actividades: { orderBy: { fecha: 'asc' } },
      organizacion: true,
      contacto: true,
    },
  });
  return row ? toLead(row) : null;
}

// ─── Mutaciones ────────────────────────────────────────────────────

/**
 * Cambia el estado de un lead. Si pasa a un estado cerrado y no tenía
 * fecha de cierre, se la asignamos al momento del cambio (a menos que
 * el caller la provea explícitamente).
 */
export async function updateLeadEstado(
  codigo: string,
  nuevoEstado: EstadoLead,
  fechaCierre?: Date | string,
): Promise<Lead> {
  const isCerrado = nuevoEstado === 'cerrado_ganado' || nuevoEstado === 'cerrado_perdido';
  const cierre = isCerrado ? (toDate(fechaCierre) ?? new Date()) : null;

  const updated = await prisma.lead.update({
    where: { codigo },
    data: {
      estado: nuevoEstado,
      ...(isCerrado ? { fechaCierre: cierre } : {}),
    },
    include: {
      actividades: { orderBy: { fecha: 'asc' } },
      organizacion: true,
      contacto: true,
    },
  });

  revalidatePath('/pipeline');
  revalidatePath('/');
  return toLead(updated);
}

export type LeadEditableFields = {
  servicioInteres?: string | null;
  comentarios?: string | null;
  desafioOportunidad?: string | null;
  canal?: string | null;
  encargado?: string | null;
  encargadoEmail?: string | null;
  proximaActividad?: string | null;
  fechaProximaActividad?: Date | string | null;
  fechaCierre?: Date | string | null;
  historialTexto?: string | null;
  estado?: EstadoLead;
};

function toDate(value: Date | string | null | undefined): Date | null | undefined {
  if (value == null) return value;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export async function updateLead(
  codigo: string,
  patch: LeadEditableFields,
): Promise<Lead> {
  const data: Prisma.LeadUpdateInput = {};
  if (patch.servicioInteres        !== undefined) data.servicioInteres        = patch.servicioInteres;
  if (patch.comentarios            !== undefined) data.comentarios            = patch.comentarios;
  if (patch.desafioOportunidad     !== undefined) data.desafioOportunidad     = patch.desafioOportunidad;
  if (patch.canal                  !== undefined) data.canal                  = patch.canal;
  if (patch.encargado              !== undefined) data.encargado              = patch.encargado;
  if (patch.encargadoEmail         !== undefined) data.encargadoEmail         = patch.encargadoEmail;
  if (patch.proximaActividad       !== undefined) data.proximaActividad       = patch.proximaActividad;
  if (patch.fechaProximaActividad  !== undefined) data.fechaProximaActividad  = toDate(patch.fechaProximaActividad);
  if (patch.fechaCierre            !== undefined) data.fechaCierre            = toDate(patch.fechaCierre);
  if (patch.historialTexto         !== undefined) data.historialTexto         = patch.historialTexto;
  if (patch.estado                 !== undefined) data.estado                 = patch.estado;

  const updated = await prisma.lead.update({
    where: { codigo },
    data,
    include: {
      actividades: { orderBy: { fecha: 'asc' } },
      organizacion: true,
      contacto: true,
    },
  });

  revalidatePath('/pipeline');
  revalidatePath(`/pipeline/${codigo}`);
  return toLead(updated);
}

async function nextLeadCodigo(year: number): Promise<string> {
  const last = await prisma.lead.findFirst({
    where: { codigo: { startsWith: `LEAD-${year}-` } },
    orderBy: { codigo: 'desc' },
  });
  const n = last ? Number(last.codigo.slice(-3)) : 0;
  return `LEAD-${year}-${String(n + 1).padStart(3, '0')}`;
}

export type LeadCreateInput = {
  organizacionCodigo: string;
  /** Opcional: un lead puede crearse "desde cero" sin contacto vinculado. */
  contactoCodigo?: string | null;
  servicioInteres: string;
  comentarios?: string;
  desafioOportunidad?: string;
  historialTexto?: string;
  encargado?: string;
  encargadoEmail?: string;
  canal?: string;
  proximaActividad?: string;
  fechaProximaActividad?: Date | string;
  fechaCierre?: Date | string;
  estado?: EstadoLead;
};

export async function createLead(input: LeadCreateInput): Promise<Lead> {
  const org = await prisma.organization.findUnique({
    where: { codigo: input.organizacionCodigo },
  });
  if (!org) throw new Error(`Organización "${input.organizacionCodigo}" no existe`);

  // El contacto es opcional. Si viene, validamos que exista y pertenezca
  // a la misma organización.
  let contactoId: string | null = null;
  if (input.contactoCodigo) {
    const contacto = await prisma.contact.findUnique({
      where: { codigo: input.contactoCodigo },
    });
    if (!contacto) throw new Error(`Contacto "${input.contactoCodigo}" no existe`);
    if (contacto.organizacionId !== org.id) {
      throw new Error('El contacto no pertenece a la organización seleccionada');
    }
    contactoId = contacto.id;
  }

  const year = new Date().getFullYear();
  const codigo = await nextLeadCodigo(year);

  const created = await prisma.lead.create({
    data: {
      codigo,
      organizacionId:        org.id,
      contactoId,
      anio:                  year,
      estado:                input.estado ?? 'nuevo',
      servicioInteres:       input.servicioInteres,
      comentarios:           input.comentarios ?? null,
      desafioOportunidad:    input.desafioOportunidad ?? null,
      historialTexto:        input.historialTexto ?? null,
      encargado:             input.encargado ?? null,
      encargadoEmail:        input.encargadoEmail ?? null,
      canal:                 input.canal ?? null,
      proximaActividad:      input.proximaActividad ?? null,
      fechaProximaActividad: toDate(input.fechaProximaActividad) ?? null,
      fechaCierre:           toDate(input.fechaCierre) ?? null,
    },
    include: {
      actividades: true,
      organizacion: true,
      contacto: true,
    },
  });

  revalidatePath('/pipeline');
  revalidatePath('/');
  return toLead(created);
}

// ─── Activities ────────────────────────────────────────────────────

export async function addActivity(
  leadCodigo: string,
  input: {
    tipo: TipoActividad;
    estado: EstadoActividad;
    nota: string;
    responsable: string;
    fecha: Date | string;
  },
): Promise<Activity> {
  const lead = await prisma.lead.findUnique({ where: { codigo: leadCodigo } });
  if (!lead) throw new Error(`Lead "${leadCodigo}" no existe`);

  const fecha = toDate(input.fecha) ?? new Date();
  const created = await prisma.activity.create({
    data: {
      leadId:      lead.id,
      tipo:        input.tipo,
      estado:      input.estado,
      nota:        input.nota,
      responsable: input.responsable,
      fecha,
      ...(input.estado === 'realizada' ? { fechaCompletada: new Date() } : {}),
    },
  });

  // Sincronizamos lead.proximaActividad si se quedó vacía o si esta es
  // la siguiente pendiente más próxima.
  await syncLeadNextActivity(lead.id);
  revalidatePath('/pipeline');
  return toActivity(created);
}

export async function setActivityEstado(
  activityId: string,
  estado: EstadoActividad,
): Promise<Activity> {
  const updated = await prisma.activity.update({
    where: { id: activityId },
    data: {
      estado,
      fechaCompletada: estado === 'realizada' ? new Date() : null,
    },
  });
  await syncLeadNextActivity(updated.leadId);
  revalidatePath('/pipeline');
  return toActivity(updated);
}

async function syncLeadNextActivity(leadDbId: string): Promise<void> {
  const next = await prisma.activity.findFirst({
    where: { leadId: leadDbId, estado: 'pendiente' },
    orderBy: { fecha: 'asc' },
  });
  await prisma.lead.update({
    where: { id: leadDbId },
    data: {
      proximaActividad:      next?.nota ?? null,
      fechaProximaActividad: next?.fecha ?? null,
    },
  });
}
