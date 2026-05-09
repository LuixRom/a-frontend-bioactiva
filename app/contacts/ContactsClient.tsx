'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Phone, Mail, Building2, ExternalLink, MessageSquare, Sparkles, ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';
import { getInitials, cn } from '@/src/lib/utils';
import { VOCATIVOS } from '@/src/lib/constants';
import type { Contact, Organization, Lead } from '@/src/types/crm';
import DataTable from '@/src/components/ui/DataTable';
import OrgTypeahead from '@/src/components/ui/OrgTypeahead';
import { createContact } from '@/src/server/actions/contacts';
import { useToast } from '@/src/components/ui/Toast';

interface ContactsClientProps {
  initialContacts: Contact[];
  organizations: Organization[];
  leads: Lead[];
}

export default function ContactsClient({
  initialContacts,
  organizations,
  leads,
}: ContactsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { showToast } = useToast();
  const [contactsList, setContactsList] = useState<Contact[]>(initialContacts);
  const orgsList = organizations;
  const [view, setView] = useState<'list' | 'new' | 'detail'>('list');
  const [orgFilter, setOrgFilter] = useState<string | null>(null);

  useEffect(() => {
    const orgId = searchParams.get('orgId');
    if (orgId) setOrgFilter(orgId);
  }, [searchParams]);
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

    startTransition(async () => {
      try {
        const created = await createContact({
          organizacionCodigo: form.organizacionId,
          vocativo:    form.vocativo || null,
          nombres:     form.nombres,
          apellidos:   form.apellidos,
          correo1:     form.correo1 || null,
          correo2:     form.correo2 || null,
          telefono:    form.telefono || null,
          cargo:       form.cargo || null,
          comentarios: form.comentarios || null,
        });
        setContactsList((prev) => [created, ...prev]);
        setView('list');
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
        showToast('Contacto creado', 'success');
        router.refresh();
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'Error al crear contacto',
          'error',
        );
      }
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
        const org = organizations.find(o => o.id === item.organizacionId);
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
        <div className="flex gap-1">
          <Link
            href={`/pipeline?prefillContact=${encodeURIComponent(item.id)}`}
            title="Convertir en lead"
            className="p-1.5 rounded-lg hover:bg-amber-50 text-text-muted hover:text-amber-600 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
          </Link>
          <button
            onClick={() => { setSelectedContactId(item.id); setView('detail'); }}
            title="Ver perfil"
            className="p-1.5 rounded-lg hover:bg-app-bg text-text-muted hover:text-primary transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const selectedContact = contactsList.find(c => c.id === selectedContactId);
  const selectedOrg = organizations.find(o => o.id === selectedContact?.organizacionId);
  const contactLeads = leads.filter((l) => l.contactoId === selectedContactId);
  const filterOrg = orgFilter ? organizations.find(o => o.id === orgFilter) : null;
  const displayedContacts = orgFilter
    ? contactsList.filter(c => c.organizacionId === orgFilter)
    : contactsList;

  return (
    <div className="space-y-6">
      {/* Tabs — hidden in detail view */}
      {view !== 'detail' && (
        <div className="flex gap-1 bg-app-bg p-1 rounded-xl border border-border-subtle w-fit">
          <button
            onClick={() => { setView('list'); setForm({ vocativo: '', nombres: '', apellidos: '', correo1: '', correo2: '', cargo: '', telefono: '', comentarios: '', organizacionId: '' }); }}
            className={cn('px-5 py-2 rounded-lg text-sm font-bold transition-all', view === 'list' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text')}
          >
            Contactos
          </button>
          <button
            onClick={() => setView('new')}
            className={cn('px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5', view === 'new' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text')}
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo Contacto
          </button>
        </div>
      )}

      {view === 'list' && (
        <>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-text">Directorio de Contactos</h1>
            {filterOrg && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-semibold text-primary">
                <Building2 className="w-3.5 h-3.5" />
                {filterOrg.nombre}
                <button
                  onClick={() => { setOrgFilter(null); router.replace('/contacts'); }}
                  className="ml-1 hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <DataTable
            data={displayedContacts}
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
        </>
      )}

      {view === 'new' && (
        <div className="max-w-2xl w-full mx-auto animate-fade-in">
          <div className="rounded-2xl border border-border-subtle bg-surface p-8 space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Organización <span className="text-red-500">*</span>
            </label>
            <OrgTypeahead
              label=""
              options={organizations}
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
            <button onClick={() => { setView('list'); setForm({ vocativo: '', nombres: '', apellidos: '', correo1: '', correo2: '', cargo: '', telefono: '', comentarios: '', organizacionId: '' }); }} className="btn-secondary flex-1">
              <ArrowLeft className="w-4 h-4" /> Volver a Contactos
            </button>
            <button
              onClick={handleCreateContact}
              disabled={!form.nombres || !form.organizacionId}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              Guardar Contacto
            </button>
          </div>
          </div>
        </div>
      )}

      {/* ── Detail inline view ── */}
      {view === 'detail' && selectedContact && (
        <div className="animate-fade-in space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => { setView('list'); setSelectedContactId(null); }}
                className="btn-secondary flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Volver a Contactos
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black shadow-sm">
                  {getInitials(`${selectedContact.nombres} ${selectedContact.apellidos}`)}
                </div>
                <div>
                  <h1 className="text-2xl font-black text-text">
                    {selectedContact.vocativo ? `${selectedContact.vocativo} ` : ''}{selectedContact.nombres} {selectedContact.apellidos}
                  </h1>
                  <p className="text-sm font-bold text-primary uppercase tracking-widest">{selectedContact.cargo}</p>
                </div>
              </div>
            </div>
            <Link
              href={`/pipeline?prefillContact=${encodeURIComponent(selectedContact.id)}`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Convertir en lead
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Left — contact data */}
            <div className="col-span-1 space-y-4">
              <div className="bg-surface rounded-2xl border border-border-subtle p-5 space-y-4">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Datos de contacto</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-app-bg flex items-center justify-center border border-border-subtle shrink-0">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase">Organización</p>
                    <p className="text-sm font-semibold text-text">{selectedOrg?.nombre || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-app-bg flex items-center justify-center border border-border-subtle shrink-0">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase">Correo principal</p>
                    <p className="text-sm font-semibold text-text">{selectedContact.correo1}</p>
                  </div>
                </div>
                {selectedContact.correo2 && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-app-bg flex items-center justify-center border border-border-subtle shrink-0">
                      <Mail className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-text-muted uppercase">Correo 2</p>
                      <p className="text-sm font-semibold text-text">{selectedContact.correo2}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-app-bg flex items-center justify-center border border-border-subtle shrink-0">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase">Teléfono</p>
                    <p className="text-sm font-semibold text-text">{selectedContact.telefono || '—'}</p>
                  </div>
                </div>
                {selectedContact.comentarios && (
                  <div className="pt-3 border-t border-border-subtle">
                    <p className="text-[10px] font-bold text-text-muted uppercase">Comentarios</p>
                    <p className="text-sm text-text mt-1">{selectedContact.comentarios}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right — leads */}
            <div className="col-span-2 space-y-3">
              <h4 className="text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" /> Leads asociados
                <span className="text-xs font-normal text-text-muted normal-case">({contactLeads.length})</span>
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
        </div>
      )}
    </div>
  );
}
