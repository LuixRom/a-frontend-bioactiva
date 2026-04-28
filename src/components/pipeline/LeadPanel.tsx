'use client';

import { useState } from 'react';
import { X, Save, Calendar, ExternalLink, Plus, Loader2 } from 'lucide-react';
import type { Lead, Activity } from '@/src/types/crm';
import Drawer from '@/src/components/ui/Drawer';
import Timeline from '@/src/components/ui/Timeline';
import { generateGoogleCalendarLink } from '@/src/lib/calendarLink';
import { checkAndNotify } from '@/src/lib/checkAndNotify';
import { useToast } from '@/src/components/ui/Toast';
import { cn } from '@/src/lib/utils';
import { useAuthStore } from '@/src/store/authStore';

const ESTADOS = [
  { value: 'nuevo',           label: 'Nuevo' },
  { value: 'proceso',         label: 'En Proceso' },
  { value: 'propuesta',       label: 'Propuesta' },
  { value: 'cerrado_ganado',  label: 'Cerrado — Ganado' },
  { value: 'cerrado_perdido', label: 'Cerrado — Perdido' },
] as const;

const ACTIVITY_TIPOS = [
  { value: 'reunion', label: 'Reunión' },
  { value: 'llamada', label: 'Llamada' },
  { value: 'email',   label: 'Email' },
  { value: 'otro',    label: 'Otro' },
] as const;

interface LeadPanelProps {
  lead: Lead | null;
  orgNombre: string;
  contactoNombre: string;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdate: (updated: Lead) => void;
}

export default function LeadPanel({
  lead,
  orgNombre,
  contactoNombre,
  isOpen,
  onClose,
  onLeadUpdate,
}: LeadPanelProps) {
  const { userName } = useAuthStore();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'detalle' | 'actividades'>('detalle');
  const [saving, setSaving] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);

  // Editable fields mirror from lead
  const [form, setForm] = useState<Partial<Lead>>({});
  const [activityForm, setActivityForm] = useState({
    tipo: 'reunion' as Activity['tipo'],
    nota: '',
    responsable: userName || 'Equipo Bioactiva',
  });

  // Sync form when lead changes
  const currentLead = lead ? { ...lead, ...form } : null;

  if (!lead) return null;

  // Merged view: original fields overridden by any local edits
  const merged = { ...lead, ...form };

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Error al guardar');
      const updated: Lead = await res.json();
      onLeadUpdate(updated);
      await checkAndNotify(updated);
      showToast('Cambios guardados correctamente', 'success');
      setForm({});
    } catch {
      showToast('Error al guardar los cambios', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddActivity = async () => {
    if (!lead || !activityForm.nota.trim()) return;
    setSavingActivity(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityForm),
      });
      if (!res.ok) throw new Error();
      const newAct: Activity = await res.json();
      onLeadUpdate({
        ...lead,
        ...form,
        actividades: [newAct, ...lead.actividades],
      });
      showToast('Actividad registrada', 'success');
      setActivityForm({ tipo: 'reunion', nota: '', responsable: userName || 'Equipo Bioactiva' });
    } catch {
      showToast('Error al registrar actividad', 'error');
    } finally {
      setSavingActivity(false);
    }
  };

  const calendarLink = merged.fechaProximaActividad
    ? generateGoogleCalendarLink({
        titulo: `Seguimiento — ${orgNombre}`,
        descripcion: `Lead: ${lead.id}\nActividad: ${merged.proximaActividad ?? ''}\nEncargado: ${merged.encargado ?? ''}`,
        fecha: new Date(merged.fechaProximaActividad),
      })
    : null;

  const fieldClass = 'w-full px-3 py-2.5 bg-app-bg/40 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all';
  const labelClass = 'text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1';

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={`Lead — ${orgNombre}`} width="w-[45%]">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-app-bg/50 rounded-xl border border-border-subtle">
        {(['detalle', 'actividades'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-all',
              activeTab === tab
                ? 'bg-surface text-primary shadow-subtle border border-border-subtle'
                : 'text-text-muted hover:text-text'
            )}
          >
            {tab === 'detalle' ? 'Detalle' : `Actividades (${lead.actividades.length})`}
          </button>
        ))}
      </div>

      {/* ── Tab: Detalle ── */}
      {activeTab === 'detalle' && (
        <div className="space-y-5 pb-8">
          {/* Header info */}
          <div className="bg-app-bg/40 rounded-2xl p-4 border border-border-subtle space-y-1">
            <p className="text-[10px] font-mono text-text-muted">{lead.id}</p>
            <p className="font-bold text-text">{orgNombre}</p>
            <p className="text-xs text-text-muted">{contactoNombre}</p>
          </div>

          {/* Estado */}
          <div>
            <label className={labelClass}>Estado</label>
            <select
              value={merged.estado}
              onChange={e => setForm(f => ({ ...f, estado: e.target.value as Lead['estado'] }))}
              className={fieldClass}
            >
              {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Canal */}
            <div>
              <label className={labelClass}>Canal de captación</label>
              <input
                type="text"
                value={merged.canal ?? ''}
                onChange={e => setForm(f => ({ ...f, canal: e.target.value }))}
                className={fieldClass}
                placeholder="Email, referido, evento..."
              />
            </div>

            {/* Servicio */}
            <div>
              <label className={labelClass}>Servicio de interés</label>
              <input
                type="text"
                value={merged.servicioInteres ?? ''}
                onChange={e => setForm(f => ({ ...f, servicioInteres: e.target.value }))}
                className={fieldClass}
                placeholder="Nombre del servicio..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Encargado */}
            <div>
              <label className={labelClass}>Encargado</label>
              <input
                type="text"
                value={merged.encargado ?? ''}
                onChange={e => setForm(f => ({ ...f, encargado: e.target.value }))}
                className={fieldClass}
                placeholder="Nombre..."
              />
            </div>

            {/* Email encargado */}
            <div>
              <label className={labelClass}>Email encargado</label>
              <input
                type="email"
                value={merged.encargadoEmail ?? ''}
                onChange={e => setForm(f => ({ ...f, encargadoEmail: e.target.value }))}
                className={fieldClass}
                placeholder="correo@bioactiva.pe"
              />
            </div>
          </div>

          {/* Desafío */}
          <div>
            <label className={labelClass}>Desafío u oportunidad</label>
            <textarea
              rows={3}
              value={merged.desafioOportunidad ?? ''}
              onChange={e => setForm(f => ({ ...f, desafioOportunidad: e.target.value }))}
              className={fieldClass}
              placeholder="Contexto del cliente, problema que resuelve BioActiva..."
            />
          </div>

          {/* Próxima actividad */}
          <div>
            <label className={labelClass}>Próxima actividad</label>
            <input
              type="text"
              value={merged.proximaActividad ?? ''}
              onChange={e => setForm(f => ({ ...f, proximaActividad: e.target.value }))}
              className={fieldClass}
              placeholder="Ej: Enviar propuesta técnica..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Fecha próxima actividad */}
            <div>
              <label className={labelClass}>Fecha próxima actividad</label>
              <input
                type="date"
                value={merged.fechaProximaActividad
                  ? new Date(merged.fechaProximaActividad).toISOString().split('T')[0]
                  : ''}
                onChange={e => setForm(f => ({
                  ...f,
                  fechaProximaActividad: e.target.value ? new Date(e.target.value) : undefined
                }))}
                className={fieldClass}
              />
              {calendarLink && (
                <a
                  href={calendarLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline flex items-center gap-1 mt-1"
                >
                  <Calendar className="w-3 h-3" />
                  Agregar a Google Calendar
                </a>
              )}
            </div>

            {/* Fecha cierre estimada */}
            <div>
              <label className={labelClass}>Fecha cierre estimada</label>
              <input
                type="date"
                value={merged.fechaCierre
                  ? new Date(merged.fechaCierre).toISOString().split('T')[0]
                  : ''}
                onChange={e => setForm(f => ({
                  ...f,
                  fechaCierre: e.target.value ? new Date(e.target.value) : undefined
                }))}
                className={fieldClass}
              />
            </div>
          </div>

          {/* Historial / contexto */}
          <div>
            <label className={labelClass}>Historial / contexto general</label>
            <textarea
              rows={3}
              value={merged.historial ?? ''}
              onChange={e => setForm(f => ({ ...f, historial: e.target.value }))}
              className={fieldClass}
              placeholder="Resumen de la relación con el cliente..."
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || Object.keys(form).length === 0}
            className="btn-primary w-full disabled:opacity-40"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              : <><Save className="w-4 h-4" /> Guardar cambios</>
            }
          </button>
        </div>
      )}

      {/* ── Tab: Actividades ── */}
      {activeTab === 'actividades' && (
        <div className="space-y-6 pb-8">
          {/* Quick-add form */}
          <div className="bg-app-bg/40 rounded-2xl p-4 border border-border-subtle space-y-4">
            <p className="text-xs font-bold text-text uppercase tracking-wider">Registrar actividad</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Tipo</label>
                <select
                  value={activityForm.tipo}
                  onChange={e => setActivityForm(f => ({ ...f, tipo: e.target.value as Activity['tipo'] }))}
                  className={fieldClass}
                >
                  {ACTIVITY_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Responsable</label>
                <input
                  type="text"
                  value={activityForm.responsable}
                  onChange={e => setActivityForm(f => ({ ...f, responsable: e.target.value }))}
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Notas del contacto</label>
              <textarea
                rows={3}
                value={activityForm.nota}
                onChange={e => setActivityForm(f => ({ ...f, nota: e.target.value }))}
                className={fieldClass}
                placeholder="¿Qué se conversó con el cliente?"
              />
            </div>

            <button
              onClick={handleAddActivity}
              disabled={savingActivity || !activityForm.nota.trim()}
              className="btn-primary w-full disabled:opacity-40"
            >
              {savingActivity
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                : <><Plus className="w-4 h-4" /> Registrar actividad</>
              }
            </button>
          </div>

          {/* Timeline */}
          <Timeline
            items={lead.actividades.map(a => ({
              id: a.id,
              fecha: a.fecha instanceof Date ? a.fecha : new Date(a.fecha),
              tipo: a.tipo,
              nota: a.nota,
              responsable: a.responsable,
            }))}
          />
        </div>
      )}
    </Drawer>
  );
}
