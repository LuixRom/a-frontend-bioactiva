'use client';

import { useState, useMemo, useCallback } from 'react';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { Plus, Download } from 'lucide-react';
import { mockLeads, mockOrganizations, mockContacts } from '@/src/lib/mockData';
import type { Lead } from '@/src/types/crm';
import { KanbanColumn } from '@/src/components/pipeline/KanbanColumn';
import LeadPanel from '@/src/components/pipeline/LeadPanel';
import FilterPanel, { applyFilters, emptyFilters, type FilterState } from '@/src/components/filters/FilterPanel';
import { useToast } from '@/src/components/ui/Toast';
import { exportToCsv } from '@/src/lib/exportCsv';
import Drawer from '@/src/components/ui/Drawer';
import OrgTypeahead from '@/src/components/ui/OrgTypeahead';
import { generateLeadId } from '@/src/lib/generateId';
import { ESTADOS_LEAD } from '@/src/lib/constants';

const COLUMNAS = ESTADOS_LEAD;

const emptyLeadForm = {
  organizacionId: '',
  contactoId: '',
  servicioInteres: '',
  comentarios: '',
  desafioOportunidad: '',
  historial: '',
  encargado: '',
  encargadoEmail: '',
  canal: '',
  proximaActividad: '',
  fechaProximaActividad: '',
  fechaCierre: '',
  estado: 'nuevo' as Lead['estado'],
};

export default function PipelinePage() {
  const { showToast } = useToast();
  const [leads, setLeads]           = useState<Lead[]>(mockLeads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showNewLead, setShowNewLead]   = useState(false);
  const [filters, setFilters]           = useState<FilterState>(emptyFilters);
  const [leadForm, setLeadForm]         = useState(emptyLeadForm);

  // Client-side filtering
  const filteredLeads = useMemo(
    () => applyFilters(leads, mockOrganizations, filters),
    [leads, filters]
  );

  const leadsByStatus = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const col of COLUMNAS) map[col.id] = [];
    for (const l of filteredLeads) {
      if (map[l.estado]) map[l.estado].push(l);
    }
    return map;
  }, [filteredLeads]);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId as Lead['estado'];

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === draggableId ? { ...l, estado: newStatus } : l));

    try {
      const res = await fetch(`/api/leads/${draggableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newStatus }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert optimistic update on failure
      setLeads(prev => prev.map(l => l.id === draggableId ? { ...l, estado: source.droppableId as Lead['estado'] } : l));
      showToast('Error al actualizar el estado del lead', 'error');
    }
  }, [showToast]);

  const handleLeadUpdate = useCallback((updated: Lead) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
    setSelectedLead(updated);
  }, []);

  const handleExport = () => {
    exportToCsv('bioactiva-pipeline', filteredLeads.map(l => ({
      id: l.id,
      estado: l.estado,
      organizacion: mockOrganizations.find(o => o.id === l.organizacionId)?.nombre ?? '',
      contacto: (() => { const c = mockContacts.find(c => c.id === l.contactoId); return c ? `${c.nombres} ${c.apellidos}` : ''; })(),
      servicio: l.servicioInteres ?? '',
      canal: l.canal ?? '',
      encargado: l.encargado ?? '',
      proximaActividad: l.proximaActividad ?? '',
      fechaProximaActividad: l.fechaProximaActividad?.toISOString().split('T')[0] ?? '',
      creadoEn: l.creadoEn.toISOString().split('T')[0],
    })));
  };

  const availableContacts = useMemo(
    () => mockContacts.filter(contact => contact.organizacionId === leadForm.organizacionId),
    [leadForm.organizacionId]
  );

  const nextLeadId = useMemo(() => generateLeadId(leads.length + 1), [leads.length]);

  const resetLeadForm = useCallback(() => {
    setLeadForm(emptyLeadForm);
    setShowNewLead(false);
  }, []);

  const handleLeadCreate = useCallback(() => {
    if (!leadForm.organizacionId || !leadForm.contactoId || !leadForm.servicioInteres.trim()) {
      return;
    }

    const newLead: Lead = {
      id: nextLeadId,
      organizacionId: leadForm.organizacionId,
      contactoId: leadForm.contactoId,
      servicioInteres: leadForm.servicioInteres.trim(),
      comentarios: leadForm.comentarios.trim() || undefined,
      desafioOportunidad: leadForm.desafioOportunidad.trim() || undefined,
      historial: leadForm.historial.trim() || undefined,
      encargado: leadForm.encargado.trim() || undefined,
      encargadoEmail: leadForm.encargadoEmail.trim() || undefined,
      canal: leadForm.canal.trim() || undefined,
      proximaActividad: leadForm.proximaActividad.trim() || undefined,
      fechaProximaActividad: leadForm.fechaProximaActividad ? new Date(leadForm.fechaProximaActividad) : undefined,
      fechaCierre: leadForm.fechaCierre ? new Date(leadForm.fechaCierre) : undefined,
      estado: leadForm.estado,
      actividades: [],
      creadoEn: new Date(),
    };

    setLeads(prev => [newLead, ...prev]);
    setSelectedLead(newLead);
    setLeadForm(emptyLeadForm);
    setShowNewLead(false);
    showToast('Lead creado correctamente', 'success');
  }, [leadForm, nextLeadId, showToast]);

  const panelOrg     = selectedLead ? mockOrganizations.find(o => o.id === selectedLead.organizacionId) : null;
  const panelContact = selectedLead ? mockContacts.find(c => c.id === selectedLead.contactoId) : null;
  const canSaveLead  = Boolean(
    leadForm.organizacionId &&
    leadForm.contactoId &&
    leadForm.servicioInteres.trim()
  );

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text">Pipeline Comercial</h1>
          <p className="text-sm text-text-muted">
            Mostrando <span className="text-primary font-bold">{filteredLeads.length}</span> de{' '}
            <span className="font-bold">{leads.length}</span> leads
          </p>
        </div>
        <button
          onClick={handleExport}
          className="btn-secondary"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* Filter panel */}
      <FilterPanel
        leads={leads}
        organizations={mockOrganizations}
        filters={filters}
        onChange={setFilters}
      />

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 pb-6 min-h-[600px]">
            {COLUMNAS.map(col => (
              <KanbanColumn
                key={col.id}
                column={col}
                leads={leadsByStatus[col.id] ?? []}
                organizations={mockOrganizations}
                contacts={mockContacts}
                onCardClick={setSelectedLead}
                onAddLead={() => setShowNewLead(true)}
              />
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Lead detail panel */}
      <LeadPanel
        lead={selectedLead}
        orgNombre={panelOrg?.nombre ?? ''}
        contactoNombre={panelContact ? `${panelContact.nombres} ${panelContact.apellidos}` : '—'}
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onLeadUpdate={handleLeadUpdate}
      />

      <Drawer isOpen={showNewLead} onClose={resetLeadForm} title="Nuevo Lead">
        <div className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
              ID Lead <span className="normal-case text-primary font-semibold">(generado automáticamente)</span>
            </label>
            <input
              type="text"
              readOnly
              value={nextLeadId}
              className="w-full px-4 py-3 bg-app-bg/60 border border-border-subtle rounded-xl text-sm font-mono text-text-muted cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Organización <span className="text-red-500">*</span>
            </label>
            <OrgTypeahead
              options={mockOrganizations}
              value={leadForm.organizacionId}
              onChange={(id) => setLeadForm(prev => ({ ...prev, organizacionId: id, contactoId: '' }))}
              onCreateNew={() => {}}
              placeholder="Buscar organización existente..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Contacto <span className="text-red-500">*</span>
            </label>
            <select
              value={leadForm.contactoId}
              onChange={(e) => setLeadForm(prev => ({ ...prev, contactoId: e.target.value }))}
              disabled={!leadForm.organizacionId}
              className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all disabled:opacity-50"
            >
              <option value="">
                {leadForm.organizacionId ? 'Seleccionar contacto...' : 'Primero selecciona una organización'}
              </option>
              {availableContacts.map(contact => (
                <option key={contact.id} value={contact.id}>
                  {contact.nombres} {contact.apellidos}{contact.cargo ? ` · ${contact.cargo}` : ''}
                </option>
              ))}
            </select>
            {leadForm.organizacionId && availableContacts.length === 0 && (
              <p className="text-xs text-text-muted">La organización seleccionada no tiene contactos mock registrados.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Estado inicial <span className="text-red-500">*</span>
              </label>
              <select
                value={leadForm.estado}
                onChange={(e) => setLeadForm(prev => ({ ...prev, estado: e.target.value as Lead['estado'] }))}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
              >
                {COLUMNAS.map(col => (
                  <option key={col.id} value={col.id}>{col.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Fecha de creación</label>
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
              onChange={(e) => setLeadForm(prev => ({ ...prev, servicioInteres: e.target.value }))}
              className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
              placeholder="Ej: Formulación de proyecto Innovasuyu"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Comentarios</label>
            <textarea
              rows={3}
              value={leadForm.comentarios}
              onChange={(e) => setLeadForm(prev => ({ ...prev, comentarios: e.target.value }))}
              className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all resize-none"
              placeholder="Notas internas del lead..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Desafío u oportunidad</label>
            <textarea
              rows={3}
              value={leadForm.desafioOportunidad}
              onChange={(e) => setLeadForm(prev => ({ ...prev, desafioOportunidad: e.target.value }))}
              className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all resize-none"
              placeholder="Problema concreto o necesidad comercial detectada..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Historial de contacto</label>
            <textarea
              rows={3}
              value={leadForm.historial}
              onChange={(e) => setLeadForm(prev => ({ ...prev, historial: e.target.value }))}
              className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all resize-none"
              placeholder="Resumen de reuniones, correos o contexto previo..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Encargado</label>
              <input
                type="text"
                value={leadForm.encargado}
                onChange={(e) => setLeadForm(prev => ({ ...prev, encargado: e.target.value }))}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="Ej: Karien Diaz"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Correo del encargado</label>
              <input
                type="email"
                value={leadForm.encargadoEmail}
                onChange={(e) => setLeadForm(prev => ({ ...prev, encargadoEmail: e.target.value }))}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="correo@bioactiva.pe"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Canal de captación</label>
              <input
                type="text"
                value={leadForm.canal}
                onChange={(e) => setLeadForm(prev => ({ ...prev, canal: e.target.value }))}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="Ej: Referido, LinkedIn, Evento presencial"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Próxima actividad</label>
              <input
                type="text"
                value={leadForm.proximaActividad}
                onChange={(e) => setLeadForm(prev => ({ ...prev, proximaActividad: e.target.value }))}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="Ej: Enviar propuesta técnica"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Fecha de próxima actividad</label>
              <input
                type="date"
                value={leadForm.fechaProximaActividad}
                onChange={(e) => setLeadForm(prev => ({ ...prev, fechaProximaActividad: e.target.value }))}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Fecha de cierre</label>
              <input
                type="date"
                value={leadForm.fechaCierre}
                onChange={(e) => setLeadForm(prev => ({ ...prev, fechaCierre: e.target.value }))}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={resetLeadForm} className="btn-secondary flex-1">Cancelar</button>
            <button
              onClick={handleLeadCreate}
              disabled={!canSaveLead}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              Guardar lead
            </button>
          </div>
        </div>
      </Drawer>

      {/* FAB — Nuevo lead */}
      <button
        onClick={() => setShowNewLead(true)}
        className="fixed bottom-8 right-8 z-30 flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl shadow-lg hover:shadow-xl hover:brightness-110 transition-all font-bold text-sm"
      >
        <Plus className="w-5 h-5" />
        Nuevo lead
      </button>
    </div>
  );
}
