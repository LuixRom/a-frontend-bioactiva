'use client';

import { useState } from 'react';
import { Save, Calendar, Plus, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import type { Lead, Activity } from '@/src/types/crm';
import Drawer from '@/src/components/ui/Drawer';
import Timeline from '@/src/components/ui/Timeline';
import { generateGoogleCalendarLink } from '@/src/lib/calendarLink';
import { checkAndNotify } from '@/src/lib/checkAndNotify';
import { useToast } from '@/src/components/ui/Toast';
import { cn } from '@/src/lib/utils';
import { useAuthStore } from '@/src/store/authStore';
import { getActivityStatus, syncLeadNextActivity } from '@/src/lib/activityStatus';

const ESTADOS = [
  { value: 'en_prospecto',     label: 'En prospecto' },
  { value: 'ofertado',         label: 'Ofertado' },
  { value: 'cierre_con_venta', label: 'Cierre con venta' },
  { value: 'cierre_sin_venta', label: 'Cierre sin venta' },
] as const;

const ACTIVITY_TIPOS = [
  { value: 'reunion', label: 'Reunión' },
  { value: 'llamada', label: 'Llamada' },
  { value: 'email',   label: 'Email' },
  { value: 'otro',    label: 'Otro' },
] as const;

const ACTIVITY_ESTADOS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'realizada', label: 'Realizada' },
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
    estado: 'pendiente' as Activity['estado'],
    nota: '',
    responsable: userName || 'Equipo Bioactiva',
    fecha: new Date().toISOString().slice(0, 10),
  });

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
      const updatedLead = syncLeadNextActivity({
        ...lead,
        ...form,
        actividades: [newAct, ...lead.actividades],
      });
      onLeadUpdate(updatedLead);
      await checkAndNotify(updatedLead);
      showToast('Actividad registrada', 'success');
      setActivityForm({
        tipo: 'reunion',
        estado: 'pendiente',
        nota: '',
        responsable: userName || 'Equipo Bioactiva',
        fecha: new Date().toISOString().slice(0, 10),
      });
    } catch {
      showToast('Error al registrar actividad', 'error');
    } finally {
      setSavingActivity(false);
    }
  };

  const handleActivityStateChange = async (activityId: string, nextState: Activity['estado']) => {
    const updatedActivities = lead.actividades.map(activity =>
      activity.id === activityId
        ? {
            ...activity,
            estado: nextState,
            fechaCompletada: nextState === 'realizada' ? new Date() : undefined,
          }
        : activity
    );

    const updatedLead = syncLeadNextActivity({
      ...lead,
      ...form,
      actividades: updatedActivities,
    });

    onLeadUpdate(updatedLead);
    await checkAndNotify(updatedLead);
    showToast(
      nextState === 'realizada' ? 'Actividad marcada como realizada' : 'Actividad marcada como pendiente',
      'success'
    );
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
  const scheduledActivities = [...lead.actividades].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

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

          <div>
            <label className={labelClass}>Comentarios</label>
            <textarea
              rows={3}
              value={merged.comentarios ?? ''}
              onChange={e => setForm(f => ({ ...f, comentarios: e.target.value }))}
              className={fieldClass}
              placeholder="Notas internas sobre la oportunidad..."
            />
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

          <div className="bg-app-bg/40 rounded-2xl p-4 border border-border-subtle space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Próximo seguimiento</p>
                <p className="text-sm font-bold text-text mt-1">{merged.proximaActividad || 'Sin seguimiento programado'}</p>
              </div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                Se gestiona en Actividades
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Fecha próxima actividad</p>
                <p className="text-sm text-text mt-1">
                  {merged.fechaProximaActividad
                    ? new Date(merged.fechaProximaActividad).toLocaleDateString('es-PE')
                    : '—'}
                </p>
                {calendarLink && (
                  <a
                    href={calendarLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline flex items-center gap-1 mt-2"
                  >
                    <Calendar className="w-3 h-3" />
                    Agregar a Google Calendar
                  </a>
                )}
              </div>

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
            <p className="text-xs font-bold text-text uppercase tracking-wider">Programar actividad</p>

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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Estado inicial</label>
                <select
                  value={activityForm.estado}
                  onChange={e => setActivityForm(f => ({ ...f, estado: e.target.value as Activity['estado'] }))}
                  className={fieldClass}
                >
                  {ACTIVITY_ESTADOS.map(state => <option key={state.value} value={state.value}>{state.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Fecha de seguimiento</label>
                <input
                  type="date"
                  value={activityForm.fecha}
                  onChange={e => setActivityForm(f => ({ ...f, fecha: e.target.value }))}
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Actividad o notas del contacto</label>
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

          <div className="space-y-4">
            <p className="text-xs font-bold text-text uppercase tracking-wider">Seguimientos programados</p>
            {scheduledActivities.length === 0 ? (
              <p className="text-sm text-text-muted italic">Sin seguimientos programados.</p>
            ) : (
              <div className="space-y-2">
                {scheduledActivities.map(activity => {
                  const status = getActivityStatus(activity);
                  const badgeClass = {
                    pendiente: 'bg-amber-100 text-amber-700',
                    realizada: 'bg-green-100 text-green-700',
                    vencida: 'bg-red-100 text-red-700',
                  }[status];

                  return (
                    <div key={activity.id} className="p-4 bg-surface border border-border-subtle rounded-xl space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-text">{activity.nota}</p>
                          <p className="text-[10px] text-text-muted uppercase tracking-wider mt-1">
                            {activity.tipo} · {new Date(activity.fecha).toLocaleDateString('es-PE')}
                          </p>
                        </div>
                        <span className={cn('px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider', badgeClass)}>
                          {status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-text-muted">Responsable: <span className="font-bold text-text">{activity.responsable}</span></p>
                        <div className="flex gap-2">
                          {activity.estado !== 'realizada' ? (
                            <button
                              onClick={() => handleActivityStateChange(activity.id, 'realizada')}
                              className="btn-secondary py-2 text-xs"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Marcar realizada
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivityStateChange(activity.id, 'pendiente')}
                              className="btn-secondary py-2 text-xs"
                            >
                              <RotateCcw className="w-4 h-4" /> Reabrir
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Timeline */}
          <Timeline
            items={lead.actividades.map(a => ({
              id: a.id,
              fecha: a.fecha instanceof Date ? a.fecha : new Date(a.fecha),
              tipo: a.tipo,
              estado: a.estado,
              nota: a.nota,
              responsable: a.responsable,
            }))}
          />
        </div>
      )}
    </Drawer>
  );
}
