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

const COLUMNAS = [
  { id: 'nuevo',           label: 'Nuevo',             color: '#6B7280' },
  { id: 'proceso',         label: 'Proceso',           color: '#3B82F6' },
  { id: 'propuesta',       label: 'Propuesta',         color: '#F59E0B' },
  { id: 'cerrado_ganado',  label: 'Cerrado — ganado',  color: '#10B981' },
  { id: 'cerrado_perdido', label: 'Cerrado — perdido', color: '#EF4444' },
] as const;

export default function PipelinePage() {
  const { showToast } = useToast();
  const [leads, setLeads]           = useState<Lead[]>(mockLeads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showNewLead, setShowNewLead]   = useState(false);
  const [filters, setFilters]           = useState<FilterState>(emptyFilters);

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

  const panelOrg     = selectedLead ? mockOrganizations.find(o => o.id === selectedLead.organizacionId) : null;
  const panelContact = selectedLead ? mockContacts.find(c => c.id === selectedLead.contactoId) : null;

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
