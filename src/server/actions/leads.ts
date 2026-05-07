'use server';

import { mockLeads } from '@/src/lib/mockData';
import type { Lead, Activity } from '@/src/types/crm';
import type { EstadoLead, TipoActividad, EstadoActividad } from '@/src/lib/constants';

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

export type LeadCreateInput = {
  organizacionId: string;
  contactoId?: string | null;
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

export async function listLeads(): Promise<Lead[]> {
  console.info('[MOCK] listLeads');
  return mockLeads;
}

export async function getLeadById(id: string): Promise<Lead | null> {
  console.info('[MOCK] getLeadById', id);
  return mockLeads.find(l => l.id === id) || null;
}

export async function updateLeadEstado(
  id: string,
  nuevoEstado: EstadoLead,
  fechaCierre?: Date | string,
): Promise<Lead> {
  console.info('[MOCK] updateLeadEstado', id, nuevoEstado);
  const lead = mockLeads.find(l => l.id === id);
  if (!lead) throw new Error('Lead no encontrado');
  return { ...lead, estado: nuevoEstado };
}

export async function updateLead(
  id: string,
  patch: LeadEditableFields,
): Promise<Lead> {
  console.info('[MOCK] updateLead', id, patch);
  const lead = mockLeads.find(l => l.id === id);
  if (!lead) throw new Error('Lead no encontrado');
  return { ...lead, ...patch } as any;
}

export async function createLead(input: LeadCreateInput): Promise<Lead> {
  console.info('[MOCK] createLead', input);
  return mockLeads[0];
}

export async function addActivity(
  leadId: string,
  input: {
    tipo: TipoActividad;
    estado: EstadoActividad;
    nota: string;
    responsable: string;
    fecha: Date | string;
  },
): Promise<Activity> {
  console.info('[MOCK] addActivity', leadId, input);
  return {
    id: 'mock-act-new',
    ...input,
    fecha: new Date(input.fecha),
  };
}

export async function setActivityEstado(
  activityId: string,
  estado: EstadoActividad,
): Promise<Activity> {
  console.info('[MOCK] setActivityEstado', activityId, estado);
  return {
    id: activityId,
    tipo: 'otro',
    estado,
    nota: 'Actividad mock actualizada',
    responsable: 'Admin',
    fecha: new Date(),
  };
}
