import { NextRequest, NextResponse } from 'next/server';
import { generateOrgId, generateContactId, generateLeadId } from '@/src/lib/generateId';
import type { ProcessedData } from '@/src/lib/excel-mapper';
import type { EstadoLead } from '@/src/lib/constants';

// In-memory store (replace with Prisma inserts in production)
import { mockOrganizations, mockContacts, mockLeads } from '@/src/lib/mockData';

export async function POST(req: NextRequest) {
  const body: ProcessedData = await req.json();
  const errors: string[] = [];
  let imported = 0;

  // 1. Organizations
  for (const org of body.organizations ?? []) {
    try {
      const id = generateOrgId(mockOrganizations.length + 1);
      mockOrganizations.push({
        id,
        ruc: org.ruc,
        nombre: org.nombre,
        tipo: org.tipo,
        sector: org.sector,
        ubicacion: org.ubicacion,
        creadoEn: new Date(),
      });
      imported++;
    } catch (e) {
      errors.push(`Org "${org.nombre}": ${(e as Error).message}`);
    }
  }

  // 2. Contacts
  for (const c of body.contacts ?? []) {
    try {
      const id = generateContactId(mockContacts.length + 1);
      const org = mockOrganizations.find(o => o.nombre === c.organizationNombre);
      mockContacts.push({
        id,
        organizacionId: org?.id ?? '',
        nombres: c.nombres,
        apellidos: c.apellidos,
        correo1: c.correo1 ?? '',
        creadoEn: new Date(),
      });
      imported++;
    } catch (e) {
      errors.push(`Contacto "${c.nombres}": ${(e as Error).message}`);
    }
  }

  // 3. Leads
  for (const l of body.leads ?? []) {
    try {
      const id = l.idLead || generateLeadId(mockLeads.length + 1);
      const org = mockOrganizations.find(o => o.nombre === l.organizationNombre);
      mockLeads.push({
        id,
        organizacionId: org?.id ?? '',
        contactoId: '',
        estado: (l.estado as EstadoLead) || 'nuevo',
        actividades: [],
        creadoEn: new Date(),
      });
      imported++;
    } catch (e) {
      errors.push(`Lead "${l.idLead}": ${(e as Error).message}`);
    }
  }

  const total = (body.organizations?.length ?? 0) +
                (body.contacts?.length ?? 0) +
                (body.leads?.length ?? 0);

  return NextResponse.json({ imported, total, errors }, { status: errors.length > 0 ? 207 : 200 });
}
