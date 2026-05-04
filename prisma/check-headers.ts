import * as XLSX from 'xlsx';
import * as path from 'node:path';

const p = process.env.EXCEL_PATH ??
  path.resolve(process.cwd(), '..', '..', '..', '..', 'CRM BIACTIVA.xlsx');
console.log('Path:', p);
const wb = XLSX.readFile(p, { cellDates: true });
console.log('Hojas:', wb.SheetNames);

for (const name of wb.SheetNames) {
  const sheet = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: undefined });
  console.log(`\n--- ${name} (${rows.length} filas) ---`);
  if (rows[0]) {
    console.log('Keys de fila 1:');
    for (const key of Object.keys(rows[0])) {
      console.log(`  ${JSON.stringify(key)}`);
    }
  }
}
