import { NextRequest, NextResponse } from 'next/server';
import { getLeadByCodigo, updateLead, type LeadEditableFields } from '@/src/server/actions/leads';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const lead = await getLeadByCodigo(id);
  if (!lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as LeadEditableFields;
  try {
    const updated = await updateLead(id, body);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al actualizar' },
      { status: 400 },
    );
  }
}
