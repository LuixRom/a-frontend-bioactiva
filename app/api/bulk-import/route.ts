import { NextRequest, NextResponse } from 'next/server';
import { generateOrgId, generateContactId, generateLeadId } from '@/src/lib/generateId';
import type { ProcessedData } from '@/bioactiva-crm/src/app/excel-mapper';

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
        nombreCompleto: org.nombreCompleto,
        area: org.area,
        tipo: org.tipo,
        sector: org.sector,
        tamano: org.tamano,
        ubicacion: org.ubicacion,
        linkedin: org.linkedin,
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
        vocativo: c.vocativo,
        nombres: c.nombres,
        apellidos: c.apellidos,
        correo1: c.correo1 ?? '',
        correo2: c.correo2,
        telefono: c.telefono,
        cargo: c.cargo,
        comentarios: c.comentarios,
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
      const id = l.internalId || generateLeadId(mockLeads.length + 1);
      const org = mockOrganizations.find(o => o.nombre === l.organizationNombre);
      const contact = mockContacts.find(c =>
        `${c.nombres} ${c.apellidos}`.toLowerCase() === l.contactNombre.toLowerCase()
      );
      mockLeads.push({
        id,
        organizacionId: org?.id ?? '',
        contactoId: contact?.id ?? '',
        servicioInteres: l.servicioInteres,
        canal: l.canal,
        encargado: l.encargado,
        encargadoEmail: l.encargadoEmail,
        estado: l.status.toLowerCase() as any,
        historial: l.observacion,
        actividades: [],
        creadoEn: new Date(),
      });
      imported++;
    } catch (e) {
      errors.push(`Lead "${l.internalId}": ${(e as Error).message}`);
    }
  }

  const total = (body.organizations?.length ?? 0) +
                (body.contacts?.length ?? 0) +
                (body.leads?.length ?? 0);

  return NextResponse.json({ imported, total, errors }, { status: errors.length > 0 ? 207 : 200 });
}
