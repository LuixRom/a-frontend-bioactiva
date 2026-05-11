import { create } from 'zustand';
import { mockLeads } from '@/src/lib/mockData';
import type { Lead } from '@/src/types/crm';

interface LeadStore {
  leads: Lead[];
  updateLead: (updated: Lead) => void;
  addLead: (lead: Lead) => void;
  setLeads: (leads: Lead[] | ((prev: Lead[]) => Lead[])) => void;
}

export const useLeadStore = create<LeadStore>()((set) => ({
  leads: mockLeads,

  updateLead: (updated) =>
    set((s) => ({
      leads: s.leads.map((l) => (l.id === updated.id ? updated : l)),
    })),

  addLead: (lead) =>
    set((s) => ({ leads: [lead, ...s.leads] })),

  setLeads: (leads) =>
    set((s) => ({ leads: typeof leads === 'function' ? leads(s.leads) : leads })),
}));
