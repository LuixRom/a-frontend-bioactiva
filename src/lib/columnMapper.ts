const COLUMN_MAP: Record<string, string> = {
  'N°':                    'numero',
  'Año':                   'año',
  'Mes':                   'mes',
  'ID de lead':            'idLead',
  '# Cotización':          'idCotizacion',
  'Dirigido a':            'dirigidoA',
  'Fecha de cotización':   'fechaCotizacion',
  'Cliente':               'cliente',
  'Producto':              'producto',
  'Nombre del servicio':   'nombreServicio',
  'Monto':                 'monto',
  'Moneda':                'moneda',
  'Estado del proceso':    'estadoProceso',
  'Remitente':             'remitente',
  'Observación':           'observacion',
  'Link de propuesta':     'linkPropuesta',
};

export function normalizeColumns(
  rows: Record<string, unknown>[]
): Record<string, unknown>[] {
  return rows.map(row => {
    const normalized: Record<string, unknown> = {};
    for (const [excelKey, modelKey] of Object.entries(COLUMN_MAP)) {
      if (excelKey in row) normalized[modelKey] = row[excelKey];
    }
    // Pass through any keys not in map (in case file has extra columns)
    for (const key of Object.keys(row)) {
      if (!(key in COLUMN_MAP) && row[key] !== '') {
        normalized[key] = row[key];
      }
    }
    return normalized;
  });
}
