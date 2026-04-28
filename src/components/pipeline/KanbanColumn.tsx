'use client';

import { Droppable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import type { Lead } from '@/src/types/crm';
import { KanbanCard } from './KanbanCard';
import { cn } from '@/src/lib/utils';
import type { mockOrganizations, mockContacts } from '@/src/lib/mockData';

interface ColumnDef {
  id: string;
  label: string;
  color: string;
}

interface KanbanColumnProps {
  column: ColumnDef;
  leads: Lead[];
  organizations: typeof mockOrganizations;
  contacts: typeof mockContacts;
  onCardClick: (lead: Lead) => void;
  onAddLead: () => void;
}

export function KanbanColumn({
  column,
  leads,
  organizations,
  contacts,
  onCardClick,
  onAddLead,
}: KanbanColumnProps) {
  return (
    <div className="flex-shrink-0 w-72 flex flex-col">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: column.color }} />
          <h3 className="text-xs font-bold text-text uppercase tracking-wider">{column.label}</h3>
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-surface border border-border-subtle text-text-muted">
            {leads.length}
          </span>
        </div>
        <button
          onClick={onAddLead}
          className="p-1 rounded-lg hover:bg-surface text-text-muted hover:text-primary transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 min-h-[200px] space-y-3 rounded-2xl p-2 transition-colors duration-200',
              snapshot.isDraggingOver ? 'bg-primary/5 ring-2 ring-primary/20 ring-dashed' : 'bg-app-bg/50'
            )}
          >
            {leads.map((lead, index) => {
              const org = organizations.find(o => o.id === lead.organizacionId);
              const contact = contacts.find(c => c.id === lead.contactoId);
              return (
                <KanbanCard
                  key={lead.id}
                  lead={lead}
                  orgNombre={org?.nombre ?? lead.organizacionId}
                  contactoNombre={contact ? `${contact.nombres} ${contact.apellidos}` : '—'}
                  index={index}
                  onClick={() => onCardClick(lead)}
                />
              );
            })}

            {leads.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border-subtle rounded-xl text-text-muted/40 text-xs italic">
                Sin leads
              </div>
            )}

            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
