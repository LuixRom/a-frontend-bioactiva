'use client';

import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, Loader2, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { processExcelData } from '@/src/lib/excel-mapper';
import { normalizeColumns } from '@/src/lib/columnMapper';
import {
  detectDuplicateOrgs,
  detectDuplicateContacts,
  type PreviewRow,
} from '@/src/lib/deduplication';
import { mockOrganizations, mockContacts } from '@/src/lib/mockData';
import { useToast } from '@/src/components/ui/Toast';
import { cn } from '@/src/lib/utils';
import type { OrganizationImport, ContactImport, ProcessedData } from '@/src/lib/excel-mapper';

type Step = 'upload' | 'preview' | 'done';

const STEPS = [
  { key: 'upload',  label: 'Subir archivo' },
  { key: 'preview', label: 'Preview y conflictos' },
  { key: 'done',    label: 'Confirmar importación' },
] as const;

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.findIndex(s => s.key === current);
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
              i < idx  ? 'bg-primary text-white'
                       : i === idx ? 'bg-primary text-white ring-4 ring-primary/20'
                                   : 'bg-app-bg text-text-muted border border-border-subtle'
            )}>
              {i < idx ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={cn(
              'text-xs font-semibold whitespace-nowrap',
              i === idx ? 'text-primary' : 'text-text-muted'
            )}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn('w-16 h-px mx-3', i < idx ? 'bg-primary' : 'bg-border-subtle')} />
          )}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: PreviewRow['status'] }) {
  const map = {
    nuevo:             { label: 'Nuevo',            className: 'bg-green-100 text-green-700' },
    duplicado_exacto:  { label: 'Duplicado exacto', className: 'bg-red-100 text-red-700' },
    duplicado_similar: { label: 'Similar',          className: 'bg-amber-100 text-amber-700' },
    ok:                { label: 'OK',               className: 'bg-green-100 text-green-700' },
  };
  const m = map[status];
  return <span className={cn('px-2 py-0.5 rounded-lg text-[10px] font-bold', m.className)}>{m.label}</span>;
}

export default function BulkUploadPage() {
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>('upload');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [orgRows,     setOrgRows]     = useState<PreviewRow<OrganizationImport>[]>([]);
  const [contactRows, setContactRows] = useState<PreviewRow<ContactImport>[]>([]);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; total: number; errors: string[] } | null>(null);

  const processFile = useCallback(async (file: File) => {
    setLoading(true);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[];

      const normalized = normalizeColumns(rawRows);
      const data = processExcelData(normalized as any);

      setProcessedData(data);
      setOrgRows(detectDuplicateOrgs(data.organizations, mockOrganizations));
      setContactRows(detectDuplicateContacts(data.contacts, mockContacts));
      setStep('preview');
    } catch (err) {
      showToast('Error al leer el archivo. Verifica que sea un Excel válido.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const toggleOmit = (type: 'org' | 'contact', index: number) => {
    if (type === 'org') {
      setOrgRows(rows => rows.map((r, i) => i === index ? { ...r, omit: !r.omit } : r));
    } else {
      setContactRows(rows => rows.map((r, i) => i === index ? { ...r, omit: !r.omit } : r));
    }
  };

  const handleImport = async () => {
    if (!processedData) return;
    setImporting(true);
    try {
      const orgsToImport = processedData.organizations.filter((_, i) => !orgRows[i]?.omit);
      const contactsToImport = processedData.contacts.filter((_, i) => !contactRows[i]?.omit);

      const res = await fetch('/api/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizations: orgsToImport,
          contacts: contactsToImport,
          leads: processedData.leads,
          quotes: processedData.quotes,
        }),
      });
      const result = await res.json();
      setImportResult(result);
      setStep('done');

      if (result.errors.length === 0) {
        showToast(`Se importaron ${result.imported} registros correctamente`, 'success');
      } else {
        showToast(`${result.imported} de ${result.total} registros importados. ${result.errors.length} errores.`, 'error');
      }
    } catch {
      showToast('Error al importar. Intenta de nuevo.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setProcessedData(null);
    setOrgRows([]);
    setContactRows([]);
    setImportResult(null);
    setFileName('');
  };

  const countStatus = (rows: PreviewRow[], status: PreviewRow['status']) =>
    rows.filter(r => r.status === status).length;

  const allRows = [...orgRows, ...contactRows] as PreviewRow[];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-text">Carga Masiva</h1>
        <p className="text-sm text-text-muted">Importa organizaciones, contactos y leads desde tu Excel de BioActiva</p>
      </div>

      <StepIndicator current={step} />

      {/* ── Step 1: Upload ── */}
      {step === 'upload' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'rounded-2xl p-16 text-center transition-all border-2 border-dashed',
            dragging ? 'border-primary bg-primary/5' : 'border-border-subtle bg-surface'
          )}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-sm font-semibold text-text">Procesando {fileName}...</p>
            </div>
          ) : (
            <>
              <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-secondary" />
              <p className="text-lg font-bold text-text mb-2">Arrastra tu archivo aquí</p>
              <p className="text-sm text-text-muted mb-8">Formatos aceptados: .xlsx, .xls</p>
              <label className="btn-primary cursor-pointer">
                <Upload className="w-4 h-4" />
                Seleccionar archivo
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            </>
          )}
        </div>
      )}

      {/* ── Step 2: Preview ── */}
      {step === 'preview' && processedData && (
        <div className="space-y-6">
          {/* Summary chips */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-xl text-xs font-bold border border-green-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {countStatus(allRows, 'nuevo')} nuevos
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-200">
              <XCircle className="w-3.5 h-3.5" />
              {countStatus(allRows, 'duplicado_exacto')} duplicados exactos
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              {countStatus(allRows, 'duplicado_similar')} similares
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-app-bg text-text-muted rounded-xl text-xs font-bold border border-border-subtle ml-auto">
              {processedData.leads.length} leads · {processedData.quotes.length} cotizaciones
            </div>
          </div>

          {/* Orgs table */}
          {orgRows.length > 0 && (
            <div className="rounded-2xl border border-border-subtle overflow-hidden">
              <div className="px-5 py-3 bg-app-bg/50 border-b border-border-subtle">
                <p className="text-xs font-bold text-text uppercase tracking-wider">
                  Organizaciones ({orgRows.length})
                </p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-primary text-white text-xs">
                    {['Nombre', 'RUC', 'Estado', 'Conflicto detectado', 'Omitir'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-bold uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {orgRows.map((row, i) => (
                    <tr key={i} className={cn('text-sm', row.omit && 'opacity-40 line-through')}>
                      <td className="px-4 py-3 font-medium text-text">{row.data.nombre}</td>
                      <td className="px-4 py-3 text-text-muted font-mono text-xs">{row.data.ruc || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3 text-xs text-text-muted max-w-xs truncate">{row.message || '—'}</td>
                      <td className="px-4 py-3">
                        {row.status !== 'nuevo' && (
                          <input
                            type="checkbox"
                            checked={row.omit}
                            onChange={() => toggleOmit('org', i)}
                            className="accent-primary w-4 h-4"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Contacts table */}
          {contactRows.length > 0 && (
            <div className="rounded-2xl border border-border-subtle overflow-hidden">
              <div className="px-5 py-3 bg-app-bg/50 border-b border-border-subtle">
                <p className="text-xs font-bold text-text uppercase tracking-wider">
                  Contactos ({contactRows.length})
                </p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-primary text-white text-xs">
                    {['Nombre', 'Organización', 'Estado', 'Conflicto detectado', 'Omitir'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-bold uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {contactRows.map((row, i) => (
                    <tr key={i} className={cn('text-sm', row.omit && 'opacity-40 line-through')}>
                      <td className="px-4 py-3 font-medium text-text">{row.data.nombres} {row.data.apellidos}</td>
                      <td className="px-4 py-3 text-text-muted">{row.data.organizationNombre}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3 text-xs text-text-muted max-w-xs truncate">{row.message || '—'}</td>
                      <td className="px-4 py-3">
                        {row.status !== 'nuevo' && (
                          <input
                            type="checkbox"
                            checked={row.omit}
                            onChange={() => toggleOmit('contact', i)}
                            className="accent-primary w-4 h-4"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={reset} className="btn-secondary">Cancelar</button>
            <button onClick={handleImport} disabled={importing} className="btn-primary disabled:opacity-50">
              {importing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
                : <>Importar registros seleccionados</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Done ── */}
      {step === 'done' && importResult && (
        <div className="rounded-2xl p-16 text-center bg-surface border border-border-subtle shadow-subtle animate-fade-in">
          <div className={cn(
            'w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6',
            importResult.errors.length === 0 ? 'bg-primary/10' : 'bg-amber-50'
          )}>
            {importResult.errors.length === 0
              ? <CheckCircle2 className="w-10 h-10 text-primary" />
              : <AlertTriangle className="w-10 h-10 text-amber-500" />
            }
          </div>

          <h2 className="text-2xl font-bold text-text mb-2">
            {importResult.errors.length === 0 ? '¡Importación completada!' : 'Importación parcial'}
          </h2>
          <p className="text-text-muted mb-2">
            Se importaron <span className="font-bold text-primary">{importResult.imported}</span> de{' '}
            <span className="font-bold">{importResult.total}</span> registros
          </p>

          {importResult.errors.length > 0 && (
            <div className="mt-4 text-left bg-red-50 rounded-xl p-4 border border-red-200 max-h-40 overflow-y-auto">
              {importResult.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-600">• {e}</p>
              ))}
            </div>
          )}

          <button onClick={reset} className="btn-primary mt-8">
            <Upload className="w-4 h-4" /> Subir otro archivo
          </button>
        </div>
      )}
    </div>
  );
}
