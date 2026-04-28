'use client';

import { useState, useEffect } from 'react';
import { mockOrganizations, mockContacts, mockLeads } from '@/src/lib/mockData';
import type { Organization, Contact, Lead } from '@/src/types/crm';

interface SearchResults {
  organizations: Organization[];
  contacts: Contact[];
  leads: Lead[];
}

export function useGlobalSearch(query: string): SearchResults {
  const [results, setResults] = useState<SearchResults>({
    organizations: [],
    contacts: [],
    leads: [],
  });

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({ organizations: [], contacts: [], leads: [] });
      return;
    }

    const q = query.toLowerCase();

    const organizations = mockOrganizations.filter(o =>
      o.nombre.toLowerCase().includes(q) ||
      o.ruc?.includes(q) ||
      o.sector?.toLowerCase().includes(q) ||
      o.nombreCompleto?.toLowerCase().includes(q)
    );

    const contacts = mockContacts.filter(c =>
      `${c.nombres} ${c.apellidos}`.toLowerCase().includes(q) ||
      c.correo1?.toLowerCase().includes(q) ||
      c.cargo?.toLowerCase().includes(q)
    );

    const leads = mockLeads.filter(l =>
      l.id.toLowerCase().includes(q) ||
      l.servicioInteres?.toLowerCase().includes(q) ||
      l.encargado?.toLowerCase().includes(q)
    );

    setResults({
      organizations: organizations.slice(0, 5),
      contacts: contacts.slice(0, 5),
      leads: leads.slice(0, 3),
    });
  }, [query]);

  return results;
}
