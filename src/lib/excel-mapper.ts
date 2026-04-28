export interface OrganizationImport {
  nombre: string;
  ruc?: string;
  tipo?: string;
  sector?: string;
  ubicacion?: string;
}

export interface ContactImport {
  nombres: string;
  apellidos: string;
  correo1?: string;
  organizationNombre: string;
}

export interface LeadImport {
  idLead?: string;
  organizationNombre?: string;
  estado?: string;
}

export interface QuoteImport {
  idCotizacion?: string;
  idLead?: string;
  anio?: number;
  mes?: string;
  dirigidoA?: string;
  cliente?: string;
  producto?: string;
  nombreServicio?: string;
  monto?: number;
  moneda?: string;
  estadoProceso?: string;
  remitente?: string;
  observacion?: string;
  linkPropuesta?: string;
}

export interface ProcessedData {
  organizations: OrganizationImport[];
  contacts: ContactImport[];
  leads: LeadImport[];
  quotes: QuoteImport[];
}

export function processExcelData(rows: Record<string, unknown>[]): ProcessedData {
  const orgMap = new Map<string, OrganizationImport>();
  const contactMap = new Map<string, ContactImport>();
  const leads: LeadImport[] = [];
  const quotes: QuoteImport[] = [];

  for (const row of rows) {
    const cliente = String(row.cliente ?? row.nombre ?? '').trim();
    const dirigidoA = String(row.dirigidoA ?? '').trim();

    // Extract unique organizations from "cliente"
    if (cliente && !orgMap.has(cliente)) {
      orgMap.set(cliente, { nombre: cliente });
    }

    // Extract unique contacts from "dirigidoA"
    if (dirigidoA && !contactMap.has(dirigidoA)) {
      const parts = dirigidoA.split(/\s+/);
      const nombres = parts[0] ?? dirigidoA;
      const apellidos = parts.slice(1).join(' ') || '';
      contactMap.set(dirigidoA, { nombres, apellidos, organizationNombre: cliente });
    }

    // Lead (one per unique idLead)
    const idLead = String(row.idLead ?? '').trim();
    if (idLead && !leads.find(l => l.idLead === idLead)) {
      leads.push({ idLead, organizationNombre: cliente });
    }

    // Quote (every row is a quote attempt)
    const monto = parseFloat(String(row.monto ?? '0')) || 0;
    const anio = parseInt(String(row.año ?? row.anio ?? new Date().getFullYear()), 10);
    quotes.push({
      idCotizacion: String(row.idCotizacion ?? row.numero ?? '').trim() || undefined,
      idLead: idLead || undefined,
      anio: isNaN(anio) ? undefined : anio,
      mes: String(row.mes ?? '').trim() || undefined,
      dirigidoA: dirigidoA || undefined,
      cliente: cliente || undefined,
      producto: String(row.producto ?? '').trim() || undefined,
      nombreServicio: String(row.nombreServicio ?? '').trim() || undefined,
      monto,
      moneda: String(row.moneda ?? '').trim() || undefined,
      estadoProceso: String(row.estadoProceso ?? '').trim() || undefined,
      remitente: String(row.remitente ?? '').trim() || undefined,
      observacion: String(row.observacion ?? '').trim() || undefined,
      linkPropuesta: String(row.linkPropuesta ?? '').trim() || undefined,
    });
  }

  return {
    organizations: Array.from(orgMap.values()),
    contacts: Array.from(contactMap.values()),
    leads,
    quotes,
  };
}
