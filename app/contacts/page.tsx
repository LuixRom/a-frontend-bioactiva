'use client';

import { useState } from 'react';
import { Users, Plus, Phone, Mail, Building2, ExternalLink, MessageSquare } from 'lucide-react';
import { getInitials } from '@/src/lib/utils';
import { mockContacts, mockOrganizations, mockLeads } from '@/src/lib/mockData';
import { VOCATIVOS } from '@/src/lib/constants';
import type { Contact } from '@/src/types/crm';
import DataTable from '@/src/components/ui/DataTable';
import Drawer from '@/src/components/ui/Drawer';
import OrgTypeahead from '@/src/components/ui/OrgTypeahead';
import { generateContactId } from '@/src/lib/generateId';

export default function ContactsPage() {
  const [contactsList, setContactsList] = useState<Contact[]>(mockContacts);
  const [orgsList] = useState(mockOrganizations);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const [form, setForm] = useState({
    vocativo: '',
    nombres: '',
    apellidos: '',
    correo1: '',
    correo2: '',
    cargo: '',
    telefono: '',
    comentarios: '',
    organizacionId: '',
  });

  const handleCreateContact = () => {
    if (!form.nombres || !form.organizacionId) return;

    const newContact: Contact = {
      id: generateContactId(contactsList.length + 1),
      vocativo: form.vocativo || undefined,
      nombres: form.nombres,
      apellidos: form.apellidos,
      correo1: form.correo1,
      correo2: form.correo2 || undefined,
      telefono: form.telefono,
      cargo: form.cargo,
      comentarios: form.comentarios || undefined,
      organizacionId: form.organizacionId,
      creadoEn: new Date(),
    };

    setContactsList([newContact, ...contactsList]);
    setShowCreate(false);
    setForm({
      vocativo: '',
      nombres: '',
      apellidos: '',
      correo1: '',
      correo2: '',
      cargo: '',
      telefono: '',
      comentarios: '',
      organizacionId: '',
    });
  };

  const columns = [
    {
      key: 'nombres',
      header: 'Contacto',
      sortable: true,
      render: (item: Contact) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20">
            {getInitials(`${item.nombres} ${item.apellidos}`)}
          </div>
          <div>
            <p className="font-bold text-primary">{item.nombres} {item.apellidos}</p>
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-tight">{item.cargo}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'organizacion',
      header: 'Organización',
      render: (item: Contact) => {
        const org = mockOrganizations.find(o => o.id === item.organizacionId);
        return (
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-text-muted" />
            <span className="font-medium text-text">{org?.nombre || '—'}</span>
          </div>
        );
      },
    },
    {
      key: 'contacto',
      header: 'Comunicación',
      render: (item: Contact) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-xs text-text">
            <Mail className="w-3 h-3 text-primary" /> {item.correo1}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text">
            <Phone className="w-3 h-3 text-primary" /> {item.telefono || '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (item: Contact) => (
        <button
          onClick={() => setSelectedContactId(item.id)}
          className="p-1.5 rounded-lg hover:bg-app-bg text-text-muted hover:text-primary transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const selectedContact = contactsList.find(c => c.id === selectedContactId);
  const selectedOrg = mockOrganizations.find(o => o.id === selectedContact?.organizacionId);
  const contactLeads = mockLeads.filter(l => l.contactoId === selectedContactId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text">Directorio de Contactos</h1>
          <p className="text-sm text-text-muted">Administra las personas clave y decisores de cada organización.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo Contacto
        </button>
      </div>

      {/* Main Table */}
      <DataTable
        data={contactsList}
        columns={columns}
        pageSize={10}
        searchPlaceholder="Buscar por nombre, email, cargo, organización..."
        extraSearchFields={(c) => {
          const org = orgsList.find(o => o.id === c.organizacionId);
          return [
            c.id,
            c.nombres,
            c.apellidos,
            `${c.nombres} ${c.apellidos}`,
            c.correo1 ?? '',
            c.correo2 ?? '',
            c.cargo ?? '',
            c.telefono ?? '',
            org?.nombre ?? '',
            org?.ruc ?? '',
            org?.sector ?? '',
          ];
        }}
      />

      {/* Create Contact Drawer */}
      <Drawer isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo Contacto">
        <div className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Organización <span className="text-red-500">*</span>
            </label>
            <OrgTypeahead
              options={mockOrganizations}
              value={form.organizacionId}
              onChange={(id) => setForm({ ...form, organizacionId: id })}
              onCreateNew={() => {}}
            />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Vocativo</label>
                <select
                  value={form.vocativo}
                  onChange={(e) => setForm({ ...form, vocativo: e.target.value })}
                  className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                >
                  <option value="">—</option>
                  {VOCATIVOS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Nombres <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nombres}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, nombres: e.target.value })}
                  className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                  placeholder="Ej: Carlos"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Apellidos</label>
              <input
                type="text"
                value={form.apellidos}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, apellidos: e.target.value })}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="Ej: Mendoza Ríos"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Cargo / Posición</label>
                <input
                  type="text"
                  value={form.cargo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, cargo: e.target.value })}
                  className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                  placeholder="Ej: Gerente de Compras"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Correo electrónico</label>
                <input
                  type="email"
                  value={form.correo1}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, correo1: e.target.value })}
                  className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                  placeholder="correo@empresa.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Correo electrónico 2</label>
                <input
                  type="email"
                  value={form.correo2}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, correo2: e.target.value })}
                  className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                  placeholder="correo2@empresa.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Teléfono</label>
                <input
                  type="text"
                  value={form.telefono}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, telefono: e.target.value })}
                  className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                  placeholder="+51 9..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Comentarios</label>
              <input
                type="text"
                value={form.comentarios}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, comentarios: e.target.value })}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="Notas internas del contacto"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancelar</button>
            <button
              onClick={handleCreateContact}
              disabled={!form.nombres || !form.organizacionId}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              Guardar Contacto
            </button>
          </div>
        </div>
      </Drawer>

      {/* Detail Drawer */}
      <Drawer isOpen={!!selectedContactId} onClose={() => setSelectedContactId(null)} title="Perfil del Contacto">
        {selectedContact && (
          <div className="space-y-8">
            <div className="bg-app-bg/40 p-6 rounded-2xl border border-border-subtle space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-black shadow-premium">
                  {getInitials(`${selectedContact.nombres} ${selectedContact.apellidos}`)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text">{selectedContact.vocativo ? `${selectedContact.vocativo} ` : ''}{selectedContact.nombres} {selectedContact.apellidos}</h3>
                  <p className="text-sm font-bold text-primary uppercase tracking-widest">{selectedContact.cargo}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-4 border-t border-border-subtle">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center border border-border-subtle">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase">Organización</p>
                    <p className="text-sm font-bold text-text">{selectedOrg?.nombre || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center border border-border-subtle">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase">Correo Electrónico</p>
                    <p className="text-sm font-bold text-text">{selectedContact.correo1}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center border border-border-subtle">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase">Teléfono</p>
                    <p className="text-sm font-bold text-text">{selectedContact.telefono || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center border border-border-subtle">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase">Correo 2</p>
                    <p className="text-sm font-bold text-text">{selectedContact.correo2 || '—'}</p>
                  </div>
                </div>
              </div>

              {selectedContact.comentarios && (
                <div className="bg-surface p-4 rounded-2xl border border-border-subtle">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Comentarios</p>
                  <p className="text-sm text-text mt-2">{selectedContact.comentarios}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" /> Leads en los que participa
              </h4>
              {contactLeads.length === 0 ? (
                <p className="text-sm text-text-muted italic">Sin leads asociados.</p>
              ) : (
                <div className="space-y-2">
                  {contactLeads.map(l => (
                    <div key={l.id} className="p-4 bg-surface border border-border-subtle rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-text">{l.servicioInteres || l.id}</p>
                        <p className="text-[10px] text-primary font-black uppercase">{l.estado}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-text">{l.encargado}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
