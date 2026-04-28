'use client';

import { useState, useCallback, useMemo } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, Loader2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { processExcelData } from '@/src/lib/excel-mapper';
import { normalizeColumns } from '@/src/lib/columnMapper';
import {
  detectDuplicateOrgs,
  detectDuplicateContacts,
  type PreviewRow,
} from '@/src/lib/deduplication';
import { mockOrganizations, mockContacts, mockLeads, mockQuotes } from '@/src/lib/mockData';
import { useToast } from '@/src/components/ui/Toast';
import { cn } from '@/src/lib/utils';
import { exportToCsv } from '@/src/lib/exportCsv';
import { SECTORES, TIPOS_ORG, TAMANOS_ORG } from '@/src/lib/constants';
import type { OrganizationImport, ContactImport, ProcessedData } from '@/src/lib/excel-mapper';

type Step = 'upload' | 'preview' | 'done';
type BulkMode = 'importar' | 'exportar';
type ExportTarget = 'organizaciones' | 'contactos' | 'contactos_sin_lead' | 'contactos_sin_cotizacion';

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
  const [mode, setMode] = useState<BulkMode>('importar');
  const [exportTarget, setExportTarget] = useState<ExportTarget>('organizaciones');
  const [step, setStep] = useState<Step>('upload');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [orgRows, setOrgRows] = useState<PreviewRow<OrganizationImport>[]>([]);
  const [contactRows, setContactRows] = useState<PreviewRow<ContactImport>[]>([]);
  const [exportFilters, setExportFilters] = useState({
    query: '',
    sector: '',
    tipo: '',
    tamano: '',
  });

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
      const data = processExcelData(normalized);

      setProcessedData(data);
      setOrgRows(detectDuplicateOrgs(data.organizations, mockOrganizations));
      setContactRows(detectDuplicateContacts(data.contacts, mockContacts));
      setStep('preview');
    } catch {
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

  const filteredOrganizations = useMemo(() => {
    const query = exportFilters.query.trim().toLowerCase();
    return mockOrganizations.filter(org => {
      const matchesQuery = !query || [
        org.id,
        org.nombre,
        org.nombreCompleto ?? '',
        org.ruc ?? '',
        org.ubicacion ?? '',
      ].some(value => value.toLowerCase().includes(query));
      const matchesSector = !exportFilters.sector || org.sector === exportFilters.sector;
      const matchesTipo = !exportFilters.tipo || org.tipo === exportFilters.tipo;
      const matchesTamano = !exportFilters.tamano || org.tamano === exportFilters.tamano;
      return matchesQuery && matchesSector && matchesTipo && matchesTamano;
    });
  }, [exportFilters]);

  const filteredContacts = useMemo(() => {
    const orgIds = new Set(filteredOrganizations.map(org => org.id));
    const query = exportFilters.query.trim().toLowerCase();

    return mockContacts.filter(contact => {
      if (!orgIds.has(contact.organizacionId)) return false;

      const org = mockOrganizations.find(item => item.id === contact.organizacionId);
      const contactMatches = !query || [
        contact.id,
        contact.nombres,
        contact.apellidos,
        `${contact.nombres} ${contact.apellidos}`,
        contact.correo1,
        contact.correo2 ?? '',
        contact.telefono ?? '',
        contact.cargo ?? '',
        org?.nombre ?? '',
        org?.ruc ?? '',
      ].some(value => value.toLowerCase().includes(query));

      return contactMatches;
    });
  }, [filteredOrganizations, exportFilters.query]);

  const exportRows = useMemo(() => {
    if (exportTarget === 'organizaciones') {
      return filteredOrganizations.map(org => {
        const contacts = mockContacts.filter(contact => contact.organizacionId === org.id);
        const leads = mockLeads.filter(lead => lead.organizacionId === org.id);
        return {
          id: org.id,
          ruc: org.ruc ?? '',
          organizacion: org.nombre,
          nombreCompleto: org.nombreCompleto ?? '',
          tipo: org.tipo ?? '',
          sector: org.sector ?? '',
          tamano: org.tamano ?? '',
          ubicacion: org.ubicacion ?? '',
          area: org.area ?? '',
          actividades: org.actividades ?? '',
          totalContactos: contacts.length,
          totalLeads: leads.length,
          contactoPrincipal: contacts[0] ? `${contacts[0].nombres} ${contacts[0].apellidos}` : '',
          correoPrincipal: contacts[0]?.correo1 ?? '',
          ultimoServicioInteres: leads[0]?.servicioInteres ?? '',
        };
      });
    }

    const contactsBase = filteredContacts.filter(contact => {
      const contactLeads = mockLeads.filter(lead => lead.contactoId === contact.id);
      if (exportTarget === 'contactos') return true;
      if (exportTarget === 'contactos_sin_lead') return contactLeads.length === 0;
      if (exportTarget === 'contactos_sin_cotizacion') {
        if (contactLeads.length === 0) return true;
        return contactLeads.every(lead => !mockQuotes.some(quote => quote.leadId === lead.id));
      }
      return true;
    });

    return contactsBase.map(contact => {
      const org = mockOrganizations.find(item => item.id === contact.organizacionId);
      const contactLeads = mockLeads.filter(lead => lead.contactoId === contact.id);
      const contactQuotes = mockQuotes.filter(quote => contactLeads.some(lead => lead.id === quote.leadId));
      return {
        id: contact.id,
        organizacionId: contact.organizacionId,
        organizacion: org?.nombre ?? '',
        ruc: org?.ruc ?? '',
        sector: org?.sector ?? '',
        tipoOrganizacion: org?.tipo ?? '',
        tamanoOrganizacion: org?.tamano ?? '',
        nombres: contact.nombres,
        apellidos: contact.apellidos,
        nombreCompleto: `${contact.nombres} ${contact.apellidos}`,
        correo1: contact.correo1,
        correo2: contact.correo2 ?? '',
        telefono: contact.telefono ?? '',
        cargo: contact.cargo ?? '',
        totalLeads: contactLeads.length,
        totalCotizaciones: contactQuotes.length,
        ultimoLead: contactLeads[0]?.servicioInteres ?? '',
        ultimoEstadoLead: contactLeads[0]?.estado ?? '',
      };
    });
  }, [exportTarget, filteredOrganizations, filteredContacts]);

  const exportMeta = useMemo(() => {
    switch (exportTarget) {
      case 'organizaciones':
        return {
          filename: 'bioactiva-organizaciones-filtradas',
          label: 'organizaciones',
        };
      case 'contactos':
        return {
          filename: 'bioactiva-contactos-filtrados',
          label: 'contactos',
        };
      case 'contactos_sin_lead':
        return {
          filename: 'bioactiva-contactos-sin-lead',
          label: 'contactos sin lead',
        };
      case 'contactos_sin_cotizacion':
        return {
          filename: 'bioactiva-contactos-sin-cotizacion',
          label: 'contactos sin cotización',
        };
    }
  }, [exportTarget]);

  const handleExportFiltered = useCallback(() => {
    if (exportRows.length === 0) {
      showToast('No hay registros para exportar con los filtros actuales.', 'error');
      return;
    }

    exportToCsv(exportMeta.filename, exportRows);
    showToast(`CSV exportado con ${exportRows.length} ${exportMeta.label}`, 'success');
  }, [exportRows, exportMeta, showToast]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-text">Importar / Exportar</h1>
        <p className="text-sm text-text-muted">Gestiona cargas desde Excel y exportaciones filtradas desde una sola vista.</p>
      </div>

      <div className="flex gap-1 bg-app-bg p-1 rounded-xl border border-border-subtle w-fit">
        {(['importar', 'exportar'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setMode(tab)}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-bold transition-all',
              mode === tab
                ? 'bg-surface text-primary shadow-sm'
                : 'text-text-muted hover:text-text'
            )}
          >
            {tab === 'importar' ? 'Importar' : 'Exportar'}
          </button>
        ))}
      </div>

      {mode === 'exportar' && (
        <div className="rounded-2xl border border-border-subtle bg-surface p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-text">Exportación masiva</h2>
              <p className="text-sm text-text-muted">
                Exporta un CSV filtrado por organización, sector, tipo o tamaño usando los datos mock actuales.
              </p>
            </div>
            <button onClick={handleExportFiltered} className="btn-secondary shrink-0">
              <Download className="w-4 h-4" /> Exportar CSV filtrado
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Qué exportar</label>
              <select
                value={exportTarget}
                onChange={(e) => setExportTarget(e.target.value as ExportTarget)}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
              >
                <option value="organizaciones">Organizaciones</option>
                <option value="contactos">Todos los contactos</option>
                <option value="contactos_sin_lead">Contactos sin lead</option>
                <option value="contactos_sin_cotizacion">Contactos sin cotización</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Buscar</label>
              <input
                type="text"
                value={exportFilters.query}
                onChange={(e) => setExportFilters(prev => ({ ...prev, query: e.target.value }))}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="Nombre, RUC, contacto o ubicación"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Sector</label>
              <select
                value={exportFilters.sector}
                onChange={(e) => setExportFilters(prev => ({ ...prev, sector: e.target.value }))}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
              >
                <option value="">Todos</option>
                {SECTORES.map(sector => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Tipo</label>
              <select
                value={exportFilters.tipo}
                onChange={(e) => setExportFilters(prev => ({ ...prev, tipo: e.target.value }))}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
              >
                <option value="">Todos</option>
                {TIPOS_ORG.map(tipo => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Tamaño</label>
              <select
                value={exportFilters.tamano}
                onChange={(e) => setExportFilters(prev => ({ ...prev, tamano: e.target.value }))}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
              >
                <option value="">Todos</option>
                {TAMANOS_ORG.map(tamano => (
                  <option key={tamano} value={tamano}>{tamano}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-app-bg text-xs font-bold text-text-muted border border-border-subtle">
              {exportRows.length} {exportMeta.label} listos para exportar
            </div>
            <button
              onClick={() => setExportFilters({ query: '', sector: '', tipo: '', tamano: '' })}
              className="text-xs font-bold text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      )}

      {mode === 'importar' && (
        <>
          <StepIndicator current={step} />

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

          {step === 'preview' && processedData && (
            <div className="space-y-6">
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
        </>
      )}
    </div>
  );
}
