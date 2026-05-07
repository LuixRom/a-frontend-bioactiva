import * as XLSX from 'xlsx';
import * as path from 'node:path';

const p = process.env.EXCEL_PATH ??
  path.resolve(process.cwd(), '..', '..', '..', '..', 'CRM BIACTIVA.xlsx');
const wb = XLSX.readFile(p, { cellDates: true });
const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets['Cotizaciones'], { defval: undefined, raw: false });

console.log('Total rows:', rows.length);
for (let i = 0; i < Math.min(rows.length, 2); i++) {
  console.log(`\n--- Row ${i} ---`);
  for (const [k, v] of Object.entries(rows[i])) {
    console.log(`  ${JSON.stringify(k)}: ${JSON.stringify(v)} (${typeof v})`);
  }
}
