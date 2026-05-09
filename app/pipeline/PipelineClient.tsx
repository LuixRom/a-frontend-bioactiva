'use client';

import { useState, useMemo, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { Plus, ArrowLeft } from 'lucide-react';
import type { Lead, Organization, Contact } from '@/src/types/crm';
import { KanbanColumn } from '@/src/components/pipeline/KanbanColumn';
import LeadPanel from '@/src/components/pipeline/LeadPanel';
import CloseLeadDialog from '@/src/components/pipeline/CloseLeadDialog';
import FilterPanel, {
  applyFilters,
  emptyFilters,
  type FilterState,
} from '@/src/components/filters/FilterPanel';
import { useToast } from '@/src/components/ui/Toast';
import { exportToCsv } from '@/src/lib/exportCsv';
import { cn } from '@/src/lib/utils';
import OrgTypeahead from '@/src/components/ui/OrgTypeahead';
import LeadEditView from '@/src/components/pipeline/LeadEditView';
import { ESTADOS_LEAD } from '@/src/lib/constants';
import { useAuthStore } from '@/src/store/authStore';
import { useSidebarStore } from '@/src/store/sidebarStore';
import {
  updateLeadEstado,
  createLead,
  type LeadCreateInput,
} from '@/src/server/actions/leads';

const COLUMNAS = ESTADOS_LEAD;

type LeadFormState = {
  organizacionId: string;
  contactoId: string;
  servicioInteres: string;
  comentarios: string;
  desafioOportunidad: string;
  historial: string;
  encargado: string;
  encargadoEmail: string;
  canal: string;
  proximaActividad: string;
  fechaProximaActividad: string;
  fechaCierre: string;
  estado: Lead['estado'];
};

const buildEmptyLeadForm = (
  defaults: { encargado?: string; encargadoEmail?: string } = {},
): LeadFormState => ({
  organizacionId: '',
  contactoId: '',
  servicioInteres: '',
  comentarios: '',
  desafioOportunidad: '',
  historial: '',
  encargado:      defaults.encargado      ?? '',
  encargadoEmail: defaults.encargadoEmail ?? '',
  canal: '',
  proximaActividad: '',
  fechaProximaActividad: '',
  fechaCierre: '',
  estado: 'nuevo',
});

interface PipelineClientProps {
  initialLeads: Lead[];
  organizations: Organization[];
  contacts: Contact[];
  /**
   * Si el usuario llega desde la página de Contactos con
   * `?prefillContact=ID00007` la query string se lee en el server y se
   * pasa acá para abrir el form de nuevo lead con esa org + contacto ya
   * seleccionados.
   */
  prefill?: { organizacionCodigo?: string; contactoCodigo?: string } | null;
}

export default function PipelineClient({
  initialLeads,
  organizations,
  contacts,
  prefill,
}: PipelineClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { showToast } = useToast();
  const userName  = useAuthStore((s) => s.userName);
  const userEmail = useAuthStore((s) => s.userEmail);
  const { close: closeSidebar, open: openSidebar } = useSidebarStore();

  const defaultsForNewLead = useMemo(
    () => ({
      encargado:      userName  ?? 'Karien Díaz',
      encargadoEmail: userEmail ?? '',
    }),
    [userName, userEmail],
  );

  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [view, setView] = useState<'pipeline' | 'new-lead' | 'edit-lead'>(prefill ? 'new-lead' : 'pipeline');
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [leadForm, setLeadForm] = useState<LeadFormState>(() => {
    const base = buildEmptyLeadForm(defaultsForNewLead);
    if (prefill?.organizacionCodigo) base.organizacionId = prefill.organizacionCodigo;
    if (prefill?.contactoCodigo)     base.contactoId     = prefill.contactoCodigo;
    return base;
  });

  /** Lead pendiente de confirmar cierre (vía drag o panel). */
  const [closingState, setClosingState] = useState<{
    lead: Lead;
    targetEstado: 'cerrado_ganado' | 'cerrado_perdido';
    previousEstado: Lead['estado'];
  } | null>(null);

  const filteredLeads = useMemo(
    () => applyFilters(leads, organizations, filters),
    [leads, organizations, filters],
  );

  const leadsByStatus = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const col of COLUMNAS) map[col.id] = [];
    for (const l of filteredLeads) {
      if (map[l.estado]) map[l.estado].push(l);
    }
    return map;
  }, [filteredLeads]);

  // Mapas estables para que KanbanColumn (memoized) no re-renderice por
  // referencia cambiada en cada render. Solo se recalculan si cambia
  // el array origen.
  const orgNombreById = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of organizations) m.set(o.id, o.nombre);
    return m;
  }, [organizations]);

  const contactoNombreById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of contacts) m.set(c.id, `${c.nombres} ${c.apellidos}`);
    return m;
  }, [contacts]);

  // Callbacks estables — críticos para que el drag no se reverta.
  const handleCardSelect  = useCallback((lead: Lead) => { setSelectedLead(lead); closeSidebar(); }, [closeSidebar]);
  const handleAddLead     = useCallback(() => setView('new-lead'), []);
  const handlePanelClose  = useCallback(() => { setSelectedLead(null); openSidebar(); }, [openSidebar]);

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { draggableId, destination, source } = result;
      if (!destination || destination.droppableId === source.droppableId) return;

      const newStatus = destination.droppableId as Lead['estado'];
      const previousStatus = source.droppableId as Lead['estado'];

      // Si el destino es un estado "cerrado_*", pedir confirmación antes
      // de tocar la DB. La tarjeta se queda visualmente en el destino
      // (optimistic) hasta que el usuario confirme o cancele.
      if (newStatus === 'cerrado_ganado' || newStatus === 'cerrado_perdido') {
        let movedLead: Lead | undefined;
        setLeads((prev) => {
          const next = prev.map((l) => {
            if (l.id !== draggableId) return l;
            movedLead = { ...l, estado: newStatus };
            return movedLead;
          });
          return next;
        });
        if (movedLead) {
          setClosingState({
            lead: movedLead,
            targetEstado: newStatus,
            previousEstado: previousStatus,
          });
        }
        return;
      }

      // Resto de transiciones: actualización directa con optimistic.
      setLeads((prev) =>
        prev.map((l) => (l.id === draggableId ? { ...l, estado: newStatus } : l)),
      );

      try {
        const updated = await updateLeadEstado(draggableId, newStatus);
        setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      } catch {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === draggableId ? { ...l, estado: previousStatus } : l,
          ),
        );
        showToast('Error al actualizar el estado del lead', 'error');
      }
    },
    [showToast], // ← sólo deps estables; `leads` ya no es dependencia
  );

  const handleCloseConfirm = useCallback(
    async (fechaCierre: Date) => {
      if (!closingState) return;
      const { lead, targetEstado } = closingState;
      try {
        const updated = await updateLeadEstado(lead.id, targetEstado, fechaCierre);
        setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
        showToast(
          targetEstado === 'cerrado_ganado'
            ? '🎉 Lead cerrado como ganado'
            : 'Lead cerrado como perdido',
          'success',
        );
      } catch {
        // Revert visual al estado previo
        setLeads((prev) =>
          prev.map((l) =>
            l.id === lead.id ? { ...l, estado: closingState.previousEstado } : l,
          ),
        );
        showToast('Error al cerrar el lead', 'error');
      } finally {
        setClosingState(null);
      }
    },
    [closingState, showToast],
  );

  const handleCloseCancel = useCallback(() => {
    if (!closingState) return;
    // Revertir el movimiento visual
    setLeads((prev) =>
      prev.map((l) =>
        l.id === closingState.lead.id ? { ...l, estado: closingState.previousEstado } : l,
      ),
    );
    setClosingState(null);
  }, [closingState]);

  const handleLeadUpdate = useCallback((updated: Lead) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setSelectedLead(updated);
    setEditingLead(updated);
  }, []);

  const handleEditLead = useCallback(() => {
    if (!selectedLead) return;
    setEditingLead(selectedLead);
    setSelectedLead(null);
    setView('edit-lead');
  }, [selectedLead]);

  const handleExport = () => {
    exportToCsv(
      'bioactiva-pipeline',
      filteredLeads.map((l) => ({
        id: l.id,
        estado: l.estado,
        organizacion:
          organizations.find((o) => o.id === l.organizacionId)?.nombre ?? '',
        contacto: (() => {
          const c = contacts.find((c) => c.id === l.contactoId);
          return c ? `${c.nombres} ${c.apellidos}` : '';
        })(),
        servicio: l.servicioInteres ?? '',
        canal: l.canal ?? '',
        encargado: l.encargado ?? '',
        proximaActividad: l.proximaActividad ?? '',
        fechaProximaActividad:
          l.fechaProximaActividad?.toISOString().split('T')[0] ?? '',
        creadoEn: l.creadoEn.toISOString().split('T')[0],
      })),
    );
  };

  const availableContacts = useMemo(
    () => contacts.filter((c) => c.organizacionId === leadForm.organizacionId),
    [contacts, leadForm.organizacionId],
  );

  const resetLeadForm = useCallback(() => {
    setLeadForm(buildEmptyLeadForm(defaultsForNewLead));
    setView('pipeline');
    openSidebar();
  }, [defaultsForNewLead, openSidebar]);

  const handleLeadCreate = useCallback(() => {
    // Solo organización + servicio son obligatorios. El contacto es opcional
    // porque un lead puede crearse "desde cero".
    if (
      !leadForm.organizacionId ||
      !leadForm.servicioInteres.trim()
    ) {
      return;
    }

    const input: LeadCreateInput = {
      organizacionCodigo: leadForm.organizacionId,
      contactoCodigo: leadForm.contactoId || null,
      servicioInteres: leadForm.servicioInteres.trim(),
      comentarios: leadForm.comentarios.trim() || undefined,
      desafioOportunidad: leadForm.desafioOportunidad.trim() || undefined,
      historialTexto: leadForm.historial.trim() || undefined,
      encargado: leadForm.encargado.trim() || undefined,
      encargadoEmail: leadForm.encargadoEmail.trim() || undefined,
      canal: leadForm.canal.trim() || undefined,
      proximaActividad: leadForm.proximaActividad.trim() || undefined,
      fechaProximaActividad: leadForm.fechaProximaActividad || undefined,
      fechaCierre: leadForm.fechaCierre || undefined,
      estado: leadForm.estado,
    };

    startTransition(async () => {
      try {
        const created = await createLead(input);
        setLeads((prev) => [created, ...prev]);
        setSelectedLead(created);
        closeSidebar();
        setLeadForm(buildEmptyLeadForm(defaultsForNewLead));
        setView('pipeline');
        showToast('Lead creado correctamente', 'success');
        router.refresh();
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'Error al crear el lead',
          'error',
        );
      }
    });
  }, [leadForm, router, showToast, defaultsForNewLead]);

  const panelOrg = selectedLead
    ? organizations.find((o) => o.id === selectedLead.organizacionId)
    : null;
  const panelContact = selectedLead
    ? contacts.find((c) => c.id === selectedLead.contactoId)
    : null;
  const canSaveLead = Boolean(
    leadForm.organizacionId && leadForm.servicioInteres.trim(),
  );

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-app-bg p-1 rounded-xl border border-border-subtle w-fit">
          <button
            onClick={resetLeadForm}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-bold transition-all',
              view === 'pipeline' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text',
            )}
          >
            Pipeline
          </button>
          <button
            onClick={() => setView('new-lead')}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5',
              view === 'new-lead'
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-green-50 text-green-700 hover:bg-green-100',
            )}
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo Lead
          </button>
        </div>
      </div>

      {view === 'pipeline' && (
        <>
          <FilterPanel
            leads={leads}
            organizations={organizations}
            filters={filters}
            onChange={setFilters}
          />
          <p className="text-sm text-text-muted -mt-2">
            Mostrando{' '}
            <span className="text-primary font-bold">{filteredLeads.length}</span>{' '}
            de <span className="font-bold">{leads.length}</span> leads
          </p>
          <div className="flex-1 overflow-x-auto">
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-4 pb-6 min-h-[600px]">
                {COLUMNAS.map((col) => (
                  <KanbanColumn
                    key={col.id}
                    column={col}
                    leads={leadsByStatus[col.id] ?? []}
                    orgNombreById={orgNombreById}
                    contactoNombreById={contactoNombreById}
                    onCardSelect={handleCardSelect}
                    onAddLead={handleAddLead}
                  />
                ))}
              </div>
            </DragDropContext>
          </div>
        </>
      )}

      <LeadPanel
        lead={selectedLead}
        orgNombre={panelOrg?.nombre ?? ''}
        contactoNombre={panelContact ? `${panelContact.nombres} ${panelContact.apellidos}` : '—'}
        isOpen={!!selectedLead}
        onClose={handlePanelClose}
        onEdit={handleEditLead}
      />

      <CloseLeadDialog
        isOpen={!!closingState}
        lead={closingState?.lead ?? null}
        targetEstado={closingState?.targetEstado ?? null}
        onConfirm={handleCloseConfirm}
        onCancel={handleCloseCancel}
      />

      {view === 'new-lead' && (
        <div className="max-w-2xl w-full mx-auto animate-fade-in">
          <div className="rounded-2xl border border-border-subtle bg-surface p-8 space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
              ID Lead{' '}
              <span className="normal-case text-primary font-semibold">
                (se genera al guardar)
              </span>
            </label>
            <input
              type="text"
              readOnly
              value={`LEAD-${new Date().getFullYear()}-XXX`}
              className="w-full px-4 py-3 bg-app-bg/60 border border-border-subtle rounded-xl text-sm font-mono text-text-muted cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Organización <span className="text-red-500">*</span>
            </label>
            <OrgTypeahead
              label=""
              options={organizations}
              value={leadForm.organizacionId}
              onChange={(id) =>
                setLeadForm((prev) => ({ ...prev, organizacionId: id, contactoId: '' }))
              }
              onCreateNew={() => {}}
              placeholder="Buscar organización existente..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Contacto{' '}
              <span className="normal-case text-text-muted font-normal text-[10px]">
                (opcional — puedes vincular uno después)
              </span>
            </label>
            <select
              value={leadForm.contactoId}
              onChange={(e) =>
                setLeadForm((prev) => ({ ...prev, contactoId: e.target.value }))
              }
              disabled={!leadForm.organizacionId}
              className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all disabled:opacity-50"
            >
              <option value="">
                {leadForm.organizacionId
                  ? 'Sin contacto vinculado'
                  : 'Primero selecciona una organización'}
              </option>
              {availableContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombres} {c.apellidos}
                  {c.cargo ? ` · ${c.cargo}` : ''}
                </option>
              ))}
            </select>
            {leadForm.organizacionId && availableContacts.length === 0 && (
              <p className="text-[10px] text-text-muted">
                Esta organización aún no tiene contactos registrados — el lead
                se creará sin contacto.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Estado inicial <span className="text-red-500">*</span>
              </label>
              <select
                value={leadForm.estado}
                onChange={(e) =>
                  setLeadForm((prev) => ({
                    ...prev,
                    estado: e.target.value as Lead['estado'],
                  }))
                }
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
              >
                {COLUMNAS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Fecha de creación
              </label>
              <input
                type="text"
                readOnly
                value={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-app-bg/60 border border-border-subtle rounded-xl text-sm text-text-muted cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Servicio de interés <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={leadForm.servicioInteres}
              onChange={(e) =>
                setLeadForm((prev) => ({ ...prev, servicioInteres: e.target.value }))
              }
              className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
              placeholder="Ej: Formulación de proyecto Innovasuyu"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Comentarios
            </label>
            <textarea
              rows={3}
              value={leadForm.comentarios}
              onChange={(e) =>
                setLeadForm((prev) => ({ ...prev, comentarios: e.target.value }))
              }
              className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all resize-none"
              placeholder="Notas internas del lead..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Desafío u oportunidad
            </label>
            <textarea
              rows={3}
              value={leadForm.desafioOportunidad}
              onChange={(e) =>
                setLeadForm((prev) => ({
                  ...prev,
                  desafioOportunidad: e.target.value,
                }))
              }
              className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all resize-none"
              placeholder="Problema concreto o necesidad comercial detectada..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Historial de contacto
            </label>
            <textarea
              rows={3}
              value={leadForm.historial}
              onChange={(e) =>
                setLeadForm((prev) => ({ ...prev, historial: e.target.value }))
              }
              className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all resize-none"
              placeholder="Resumen de reuniones, correos o contexto previo..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Encargado
              </label>
              <input
                type="text"
                value={leadForm.encargado}
                onChange={(e) =>
                  setLeadForm((prev) => ({ ...prev, encargado: e.target.value }))
                }
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="Ej: Karien Díaz"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Correo del encargado
              </label>
              <input
                type="email"
                value={leadForm.encargadoEmail}
                onChange={(e) =>
                  setLeadForm((prev) => ({ ...prev, encargadoEmail: e.target.value }))
                }
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="correo@bioactiva.pe"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Canal de captación
              </label>
              <input
                type="text"
                value={leadForm.canal}
                onChange={(e) =>
                  setLeadForm((prev) => ({ ...prev, canal: e.target.value }))
                }
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="Ej: Referido, LinkedIn, Evento presencial"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Próxima actividad
              </label>
              <input
                type="text"
                value={leadForm.proximaActividad}
                onChange={(e) =>
                  setLeadForm((prev) => ({
                    ...prev,
                    proximaActividad: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="Ej: Enviar propuesta técnica"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Fecha de próxima actividad
              </label>
              <input
                type="date"
                value={leadForm.fechaProximaActividad}
                onChange={(e) =>
                  setLeadForm((prev) => ({
                    ...prev,
                    fechaProximaActividad: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Fecha de cierre
              </label>
              <input
                type="date"
                value={leadForm.fechaCierre}
                onChange={(e) =>
                  setLeadForm((prev) => ({ ...prev, fechaCierre: e.target.value }))
                }
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={resetLeadForm} className="btn-secondary flex-1">
              <ArrowLeft className="w-4 h-4" /> Volver al pipeline
            </button>
            <button
              onClick={handleLeadCreate}
              disabled={!canSaveLead}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              Guardar lead
            </button>
          </div>
          </div>
        </div>
      )}

      {view === 'edit-lead' && editingLead && (() => {
        const editOrg     = organizations.find(o => o.id === editingLead.organizacionId);
        const editContact = contacts.find(c => c.id === editingLead.contactoId);
        return (
          <LeadEditView
            lead={editingLead}
            orgNombre={editOrg?.nombre ?? ''}
            contactoNombre={editContact ? `${editContact.nombres} ${editContact.apellidos}` : '—'}
            contactoEmail={editContact?.correo1}
            onBack={() => { setEditingLead(null); setView('pipeline'); openSidebar(); }}
            onLeadUpdate={handleLeadUpdate}
          />
        );
      })()}
    </div>
  );
}
