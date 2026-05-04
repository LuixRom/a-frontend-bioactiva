/**
 * Mapean filas de Prisma a los tipos del frontend (src/types/crm.ts).
 *
 * Necesario porque:
 *   - Prisma devuelve Decimal para `monto` (no serializable a JSON tal cual).
 *   - El frontend espera `id` como el código humano (`LEAD-2025-001`),
 *     no el cuid interno.
 *   - Algunos campos opcionales en DB son `null`, en frontend son `undefined`.
 */
import type {
  Organization as DbOrg,
  Contact as DbContact,
  Lead as DbLead,
  Activity as DbActivity,
  Quote as DbQuote,
  EstadoLead as DbEstadoLead,
  EstadoCotizacion as DbEstadoCot,
  EstadoActividad as DbEstadoAct,
  TipoActividad as DbTipoAct,
  Moneda as DbMoneda,
} from '@prisma/client';

import type {
  Organization,
  Contact,
  Lead,
  Activity,
  Quote,
} from '@/src/types/crm';

const toUndef = <T>(v: T | null | undefined): T | undefined => v ?? undefined;

export function toOrganization(row: DbOrg): Organization {
  return {
    id:               row.codigo,           // ID humano para el frontend
    ruc:              toUndef(row.ruc),
    nombre:           row.nombre,
    nombreCompleto:   toUndef(row.nombreCompleto),
    area:             toUndef(row.area),
    tipo:             toUndef(row.tipo),
    tamano:           toUndef(row.tamano),
    sector:           toUndef(row.sector),
    ubicacion:        toUndef(row.ubicacion),
    linkedin:         toUndef(row.linkedin),
    alianzas:         row.alianzas.length ? row.alianzas : undefined,
    actividades:      toUndef(row.actividades),
    contactoVigente:  row.contactoVigente,
    creadoEn:         row.createdAt,
  };
}

export function toContact(row: DbContact, orgCodigoMap?: Map<string, string>): Contact {
  return {
    id:             row.codigo,
    organizacionId: orgCodigoMap?.get(row.organizacionId) ?? row.organizacionId,
    vocativo:       toUndef(row.vocativo),
    nombres:        row.nombres,
    apellidos:      row.apellidos,
    correo1:        row.correo1 ?? '',
    correo2:        toUndef(row.correo2),
    telefono:       toUndef(row.telefono),
    cargo:          toUndef(row.cargo),
    comentarios:    toUndef(row.comentarios),
    creadoEn:       row.createdAt,
  };
}

export function toActivity(row: DbActivity): Activity {
  return {
    id:              row.id,
    tipo:            row.tipo as DbTipoAct,
    estado:          (row.estado === 'realizada' ? 'realizada' : 'pendiente') as DbEstadoAct & ('pendiente' | 'realizada'),
    nota:            row.nota,
    responsable:     row.responsable ?? '',
    fechaInicio:     row.fecha,
    fechaCompletada: toUndef(row.fechaCompletada),
  };
}

type DbLeadFull = DbLead & {
  actividades?: DbActivity[];
  organizacion?: { codigo: string } | DbOrg;
  contacto?: { codigo: string } | DbContact;
};

export function toLead(
  row: DbLeadFull,
  orgCodigoMap?: Map<string, string>,
  contactCodigoMap?: Map<string, string>,
): Lead {
  return {
    id:                    row.codigo,
    organizacionId:        row.organizacion?.codigo ?? orgCodigoMap?.get(row.organizacionId) ?? row.organizacionId,
    contactoId:            row.contacto?.codigo ?? contactCodigoMap?.get(row.contactoId) ?? row.contactoId,
    anio:                  row.anio,
    estado:                row.estado as DbEstadoLead,
    servicioInteres:       toUndef(row.servicioInteres),
    comentarios:           toUndef(row.comentarios),
    desafioOportunidad:    toUndef(row.desafioOportunidad),
    canal:                 toUndef(row.canal),
    encargado:             toUndef(row.encargado),
    encargadoEmail:        toUndef(row.encargadoEmail),
    proximaActividad:      toUndef(row.proximaActividad),
    fechaProximaActividad: toUndef(row.fechaProximaActividad),
    alertaManual:          toUndef(row.alertaManual),
    fechaCierre:           toUndef(row.fechaCierre),
    historialTexto:        toUndef(row.historialTexto),
    actividades:           (row.actividades ?? []).map(toActivity),
    creadoEn:              row.createdAt,
  };
}

type DbQuoteFull = DbQuote & {
  lead?: { codigo: string } | DbLead;
};

export function toQuote(
  row: DbQuoteFull,
  leadCodigoMap?: Map<string, string>,
): Quote {
  return {
    id:              row.codigo,
    leadId:          row.lead?.codigo ?? leadCodigoMap?.get(row.leadId) ?? row.leadId,
    anio:            row.anio,
    mes:             row.mes,
    dirigidoA:       row.dirigidoA,
    fechaCotizacion: row.fechaCotizacion,
    cliente:         row.cliente,
    producto:        toUndef(row.producto),
    servicio:        row.servicio,
    monto:           Number(row.monto), // Decimal → number
    moneda:          row.moneda as DbMoneda,
    estado:          row.estado as DbEstadoCot,
    remitente:       row.remitente,
    observacion:     toUndef(row.observacion),
    linkPropuesta:   toUndef(row.linkPropuesta),
    creadoEn:        row.createdAt,
  };
}
