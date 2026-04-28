'use client';

import { useState, useMemo } from 'react';
import { Building2, Plus, Search, Users, Kanban, ExternalLink } from 'lucide-react';
import { mockOrganizations, mockContacts, mockLeads } from '@/src/lib/mockData';
import type { Organization } from '@/src/types/crm';
import { generateOrgId } from '@/src/lib/generateId';
import DataTable from '@/src/components/ui/DataTable';
import Drawer from '@/src/components/ui/Drawer';
import SunatInput, { type SunatData } from '@/src/components/ui/SunatInput';
import ValidadorSunat from '@/src/components/ui/ValidadorSunat';
import { cn } from '@/src/lib/utils';

const emptyForm = {
  nombre: '',
  nombreCompleto: '',
  ruc: '',
  area: '',
  tipo: '',
  sector: '',
  tamano: '',
  ubicacion: '',
  actividades: '',
  linkedin: '',
  alianzas: '',
  contactoVigente: '',
};

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>(mockOrganizations);
  const [showCreate, setShowCreate] = useState(false);
  const [showValidador, setShowValidador] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [form, setForm] = useState(emptyForm);

  /** Auto-generate next ID based on current count */
  const nextId = useMemo(() => generateOrgId(orgs.length + 1), [orgs.length]);

  const handleSunatClear = () => {
    setForm((prev) => ({
      ...prev,
      // Limpiar solo los campos que se auto-rellenan desde SUNAT
      nombre: '',
      nombreCompleto: '',
      ubicacion: '',
      actividades: '',
    }));
    setIsFlashActive(false);
  };

  const handleSunatSuccess = (data: SunatData) => {
    setForm((prev) => ({
      ...prev,
      // Autocomplete only fields that come back with a value
      ...(data.ruc            && { ruc: data.ruc }),
      ...(data.nombre         && { nombre: data.nombre }),
      ...(data.nombreCompleto && { nombreCompleto: data.nombreCompleto }),
      ...(data.ubicacion      && { ubicacion: data.ubicacion }),
      ...(data.actividades    && { actividades: data.actividades }),
    }));
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 1200);
  };

  const handleCreate = () => {
    if (!form.nombre.trim()) return;

    const newOrg: Organization = {
      id: nextId,
      ruc: form.ruc.trim() || undefined,
      nombre: form.nombre.trim(),
      nombreCompleto: form.nombreCompleto.trim() || undefined,
      area: form.area.trim() || undefined,
      tipo: form.tipo || undefined,
      sector: form.sector.trim() || undefined,
      tamano: form.tamano || undefined,
      ubicacion: form.ubicacion.trim() || undefined,
      actividades: form.actividades.trim() || undefined,
      linkedin: form.linkedin.trim() || undefined,
      alianzas: form.alianzas.trim() || undefined,
      contactoVigente: form.contactoVigente.trim() || undefined,
      creadoEn: new Date(),
    };

    setOrgs([newOrg, ...orgs]);
    setShowCreate(false);
    setForm(emptyForm);
  };

  const columns = [
    {
      key: 'nombre',
      header: 'Organización',
      sortable: true,
      render: (item: Organization) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-app-bg flex items-center justify-center text-primary font-bold">
            {item.nombre[0]}
          </div>
          <div>
            <span className="font-bold text-primary block">{item.nombre}</span>
            {item.area && (
              <span className="text-[10px] text-text-muted">{item.area}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'ruc',
      header: 'RUC',
      sortable: true,
      render: (item: Organization) => (
        <span className={item.ruc ? 'font-mono text-sm' : 'text-text-muted text-xs italic'}>
          {item.ruc ?? 'Sin RUC'}
        </span>
      ),
    },
    { key: 'sector', header: 'Sector', sortable: true },
    {
      key: 'tamano',
      header: 'Tamaño',
      render: (item: Organization) => (
        <span className="px-2 py-1 bg-secondary/30 text-primary rounded-md text-[10px] font-bold uppercase tracking-wider">
          {item.tamano || 'N/A'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (item: Organization) => (
        <button
          onClick={() => setSelectedOrgId(item.id)}
          className="p-1.5 rounded-lg hover:bg-app-bg text-text-muted hover:text-primary transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId);
  const orgContacts = mockContacts.filter((c) => c.organizacionId === selectedOrgId);
  const orgLeads = mockLeads.filter((l) => l.organizacionId === selectedOrgId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text">Gestión de Organizaciones</h1>
          <p className="text-sm text-text-muted">Visualiza y administra tus clientes corporativos y sus datos fiscales.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowValidador(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Validador SUNAT
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Nueva Organización
          </button>
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        data={orgs}
        columns={columns}
        pageSize={8}
        searchPlaceholder="Buscar por ID, RUC, nombre, sector..."
        extraSearchFields={(org) => [
          org.id,
          org.ruc ?? '',
          org.nombre,
          org.nombreCompleto ?? '',
          org.sector ?? '',
          org.area ?? '',
          org.tipo ?? '',
          org.ubicacion ?? '',
        ]}
      />

      {/* ── Validador Drawer ── */}
      <ValidadorSunat isOpen={showValidador} onClose={() => setShowValidador(false)} />

      {/* ── Create Drawer ── */}
      <Drawer isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nueva Organización">
        <div className="space-y-6">

          {/* Auto ID (read-only) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
              ID Interno <span className="normal-case text-primary font-semibold">(generado automáticamente)</span>
            </label>
            <input
              type="text"
              value={nextId}
              readOnly
              className="w-full px-4 py-3 bg-app-bg/60 border border-border-subtle rounded-xl text-sm font-mono text-text-muted cursor-not-allowed"
            />
          </div>

          {/* RUC — Optional */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">RUC</label>
              <span className="text-[10px] text-text-muted font-normal">Opcional</span>
            </div>
            <SunatInput
              value={form.ruc}
              onChange={(val) => setForm({ ...form, ruc: val })}
              onSuccess={handleSunatSuccess}
              onClear={handleSunatClear}
            />
            <p className="text-xs text-text-muted mt-1">
              Opcional — si ingresas el RUC, los datos se completarán automáticamente desde SUNAT.
              Las organizaciones sin RUC (startups, personas naturales) pueden registrarse igualmente.
            </p>
          </div>

          <div className="space-y-4">
            {/* Nombre */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Nombre / Razón Social <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className={cn(
                  'w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all',
                  isFlashActive && 'animate-flash'
                )}
                placeholder="Nombre de la organización..."
              />
            </div>

            {/* Nombre Comercial — autocompleted from SUNAT */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Nombre Comercial
                <span className="ml-2 normal-case text-text-muted font-normal text-[10px]">Opcional</span>
              </label>
              <input
                type="text"
                value={form.nombreCompleto}
                onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })}
                className={cn(
                  'w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all',
                  isFlashActive && 'animate-flash'
                )}
                placeholder="Nombre comercial o marca..."
              />
            </div>

            {/* Área / Departamento */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Área / Departamento
                <span className="ml-2 normal-case text-text-muted font-normal text-[10px]">Opcional</span>
              </label>
              <input
                type="text"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="Ej: Área de Innovación, Gerencia de Proyectos"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Tipo */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                >
                  <option value="">Seleccionar...</option>
                  <option value="Empresa">Empresa</option>
                  <option value="Startup">Startup</option>
                  <option value="Universidad">Universidad</option>
                  <option value="Entidad Pública">Entidad Pública</option>
                  <option value="ONG">ONG</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {/* Tamaño */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Tamaño</label>
                <select
                  value={form.tamano}
                  onChange={(e) => setForm({ ...form, tamano: e.target.value })}
                  className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                >
                  <option value="">Seleccionar...</option>
                  <option value="Micro">Micro</option>
                  <option value="Pequeña">Pequeña</option>
                  <option value="Mediana">Mediana</option>
                  <option value="Grande">Grande</option>
                </select>
              </div>
            </div>

            {/* Sector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Sector</label>
              <input
                type="text"
                value={form.sector}
                onChange={(e) => setForm({ ...form, sector: e.target.value })}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="Ej: Agroindustria, Tecnología, Salud"
              />
            </div>

            {/* Ubicación */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Ubicación</label>
              <input
                type="text"
                value={form.ubicacion}
                onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                className={cn(
                  'w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all',
                  isFlashActive && 'animate-flash'
                )}
                placeholder="Ciudad, Región..."
              />
            </div>

            {/* Actividades económicas — autocompleted from SUNAT */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Actividades Económicas
                <span className="ml-2 normal-case text-text-muted font-normal text-[10px]">Opcional — SUNAT lo completa</span>
              </label>
              <input
                type="text"
                value={form.actividades}
                onChange={(e) => setForm({ ...form, actividades: e.target.value })}
                className={cn(
                  'w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all',
                  isFlashActive && 'animate-flash'
                )}
                placeholder="Ej: Fabricación de productos orgánicos..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">LinkedIn</label>
              <input
                type="text"
                value={form.linkedin}
                onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="linkedin.com/company/ejemplo"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Alianzas estratégicas</label>
              <input
                type="text"
                value={form.alianzas}
                onChange={(e) => setForm({ ...form, alianzas: e.target.value })}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="Ej: USAID, Rainforest Alliance"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Contacto vigente</label>
              <input
                type="text"
                value={form.contactoVigente}
                onChange={(e) => setForm({ ...form, contactoVigente: e.target.value })}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="Nombre del contacto principal"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancelar</button>
            <button
              onClick={handleCreate}
              disabled={!form.nombre.trim()}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              Guardar Organización
            </button>
          </div>
        </div>
      </Drawer>

      {/* ── Detail Drawer ── */}
      <Drawer
        isOpen={!!selectedOrgId}
        onClose={() => setSelectedOrgId(null)}
        title="Detalles de Organización"
      >
        {selectedOrg && (
          <div className="space-y-8">
            {/* Identity card */}
            <div className="bg-app-bg/40 p-6 rounded-2xl border border-border-subtle space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-black shadow-premium">
                  {selectedOrg.nombre[0]}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text">{selectedOrg.nombre}</h3>
                  {selectedOrg.area && (
                    <p className="text-xs text-text-muted">{selectedOrg.area}</p>
                  )}
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mt-0.5">
                    {selectedOrg.ruc ?? 'Sin RUC'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border-subtle">
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase">Sector</p>
                  <p className="text-sm font-bold text-text">{selectedOrg.sector || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase">Tamaño</p>
                  <p className="text-sm font-bold text-text">{selectedOrg.tamano || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase">Tipo</p>
                  <p className="text-sm font-bold text-text">{selectedOrg.tipo || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase">Ubicación</p>
                  <p className="text-sm font-bold text-text">{selectedOrg.ubicacion || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase">Nombre comercial</p>
                  <p className="text-sm font-bold text-text">{selectedOrg.nombreCompleto || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase">LinkedIn</p>
                  <p className="text-sm font-bold text-text">{selectedOrg.linkedin || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase">Alianzas</p>
                  <p className="text-sm font-bold text-text">{selectedOrg.alianzas || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase">Contacto vigente</p>
                  <p className="text-sm font-bold text-text">{selectedOrg.contactoVigente || '—'}</p>
                </div>
              </div>
            </div>

            {/* Contacts */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Contactos Asociados
              </h4>
              {orgContacts.length === 0 ? (
                <p className="text-sm text-text-muted italic">Sin contactos registrados.</p>
              ) : (
                <div className="space-y-2">
                  {orgContacts.map((c) => (
                    <div key={c.id} className="p-4 bg-surface border border-border-subtle rounded-xl flex items-center justify-between group hover:border-primary transition-all">
                      <div>
                        <p className="text-sm font-bold text-text group-hover:text-primary transition-colors">
                          {c.vocativo ? `${c.vocativo} ` : ''}{c.nombres} {c.apellidos}
                        </p>
                        <p className="text-xs text-text-muted">{c.cargo}</p>
                      </div>
                      <span className="text-[10px] font-bold text-text-muted bg-app-bg px-2 py-1 rounded-lg">{c.telefono || c.correo1}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Leads */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
                <Kanban className="w-4 h-4 text-primary" /> Historial de Leads
              </h4>
              {orgLeads.length === 0 ? (
                <p className="text-sm text-text-muted italic">Sin leads registrados.</p>
              ) : (
                <div className="space-y-2">
                  {orgLeads.map((l) => (
                    <div key={l.id} className="p-4 bg-app-bg/30 border border-border-subtle rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-text">{l.servicioInteres || l.id}</p>
                        <p className="text-xs text-primary font-bold uppercase">{l.estado}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-text-muted">{new Date(l.creadoEn).toLocaleDateString('es-PE')}</p>
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
