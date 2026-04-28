export function generateOrgId(index: number): string {
  const year = new Date().getFullYear();
  return `ORG-${year}-${String(index).padStart(3, '0')}`;
}

export function generateContactId(index: number): string {
  const year = new Date().getFullYear();
  return `CON-${year}-${String(index).padStart(3, '0')}`;
}

export function generateLeadId(index: number): string {
  const year = new Date().getFullYear();
  return `LEAD-${year}-${String(index).padStart(3, '0')}`;
}

export function generateQuoteId(index: number): string {
  const year = new Date().getFullYear();
  return `COT-${year}-${String(index).padStart(3, '0')}`;
}
