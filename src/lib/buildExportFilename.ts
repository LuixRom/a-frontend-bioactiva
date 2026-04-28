export function buildExportFilename(
  base: string,
  filters: Record<string, string | string[]>
): string {
  const activeFilters = Object.entries(filters)
    .filter(([, v]) => v && (Array.isArray(v) ? v.length > 0 : v !== ''))
    .map(([k, v]) => `${k}-${Array.isArray(v) ? v.join('-') : v}`)
    .join('_')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .slice(0, 60);

  const date = new Date().toISOString().split('T')[0];
  return activeFilters ? `${base}_${activeFilters}_${date}` : `${base}_${date}`;
}
