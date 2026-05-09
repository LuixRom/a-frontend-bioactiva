'use client';

import { useState } from 'react';
import { Save, Plus, Loader2, CheckCircle2, RotateCcw, ArrowLeft } from 'lucide-react';
import type { Lead, Activity } from '@/src/types/crm';
import Timeline from '@/src/components/ui/Timeline';
import { checkAndNotify } from '@/src/lib/checkAndNotify';
import { useToast } from '@/src/components/ui/Toast';
import { cn } from '@/src/lib/utils';
import { useAuthStore } from '@/src/store/authStore';
import { getActivityStatus, syncLeadNextActivity } from '@/src/lib/activityStatus';
import { ESTADOS_LEAD } from '@/src/lib/constants';
import Link from 'next/link';
import { useUsersStore } from '@/src/store/usersStore';
import { useNotificationStore } from '@/src/store/notificationStore';
import {
  useMsGraph,
  MsNotConnectedError,
  MsConsentRequiredError,
} from '@/src/hooks/useMsGraph';

const ESTADOS = ESTADOS_LEAD.map(({ id, label }) => ({ value: id, label }));
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

interface LeadEditViewProps {
  lead: Lead;
  orgNombre: string;
  contactoNombre: string;
  contactoEmail?: string;
  onBack: () => void;
  onLeadUpdate: (updated: Lead) => void;
}

export default function LeadEditView({
  lead,
  orgNombre,
  contactoNombre,
  contactoEmail,
  onBack,
  onLeadUpdate,
}: LeadEditViewProps) {
  const { userName } = useAuthStore();
  const { showToast } = useToast();
  const { users } = useUsersStore();
  const { callGraph, isConnected } = useMsGraph();

  const [activeTab, setActiveTab] = useState<'detalle' | 'actividades'>('detalle');
  const [saving, setSaving] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);
  const [addingTabEvent, setAddingTabEvent] = useState(false);
  const [tabEventAdded, setTabEventAdded] = useState(false);
  const [form, setForm] = useState<Partial<Lead>>({});
  const [activityForm, setActivityForm] = useState({
    tipo: 'reunion' as Activity['tipo'],
    estado: 'pendiente' as Activity['estado'],
    nota: '',
    responsable: userName || 'Equipo Bioactiva',
    fecha: new Date().toISOString().slice(0, 10),
    fechaFin: new Date().toISOString().slice(0, 10),
  });

  const merged = { ...lead, ...form };
  const fieldClass = 'w-full px-3 py-2.5 bg-app-bg/40 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all';
  const labelClass = 'text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1';
  const scheduledActivities = [...lead.actividades].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
  );

  const handleGraphError = (err: unknown, fallbackMsg: string): void => {
    if (err instanceof MsNotConnectedError) {
      showToast('Conecta tu cuenta Microsoft en tu perfil para usar esta función', 'error');
      return;
    }
    if (err instanceof MsConsentRequiredError) {
      showToast('Esta función requiere permisos de Microsoft 365 del administrador', 'error');
      return;
    }
    showToast(err instanceof Error ? err.message : fallbackMsg, 'error');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated: Lead = { ...lead, ...form };
      fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      }).catch(err => console.warn('API Offline:', err));

      onLeadUpdate(updated);
      await checkAndNotify(updated);

      if (updated.estado === 'cerrado_ganado' && lead.estado !== 'cerrado_ganado') {
        const { addNotification } = useNotificationStore.getState();
        addNotification({
          tipo: 'lead_cerrado',
          titulo: '🎉 ¡Cierre con venta!',
          mensaje: `El lead de ${orgNombre} fue cerrado exitosamente.`,
          destinatario: { tipo: 'global' },
          linkUrl: '/pipeline',
        });
      }
      showToast('Cambios guardados', 'success');
      setForm({});
    } catch {
      showToast('Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddActivity = async () => {
    if (!activityForm.tipo) { showToast('El tipo es obligatorio', 'error'); return; }
    if (!activityForm.nota.trim()) { showToast('La descripción es obligatoria', 'error'); return; }
    if (!activityForm.fecha) { showToast('La fecha es obligatoria', 'error'); return; }

    setSavingActivity(true);
    let linkReunion: string | undefined;

    if (activityForm.tipo === 'reunion' && isConnected) {
      try {
        const start = new Date(activityForm.fecha);
        const end = activityForm.fechaFin
          ? new Date(activityForm.fechaFin)
          : new Date(start.getTime() + 30 * 60 * 1000);

        const attendees = contactoEmail
          ? [{ emailAddress: { address: contactoEmail, name: contactoNombre || undefined }, type: 'required' as const }]
          : [];

        type GraphEvent = { id: string; onlineMeeting?: { joinUrl?: string } };
        const event = await callGraph<GraphEvent>('/me/events', {
          method: 'POST',
          body: {
            subject: `${activityForm.nota} — ${orgNombre || lead.id}`,
            body: { contentType: 'HTML', content: `<p><strong>Lead:</strong> ${lead.id}</p>` },
            start: { dateTime: start.toISOString(), timeZone: 'America/Lima' },
            end:   { dateTime: end.toISOString(),   timeZone: 'America/Lima' },
            isOnlineMeeting: true,
            onlineMeetingProvider: 'teamsForBusiness',
            attendees,
          },
        });
        linkReunion = event.onlineMeeting?.joinUrl;
        if (attendees.length > 0) showToast(`Invitación enviada a ${contactoNombre || contactoEmail}`, 'success');
      } catch (e) {
        handleGraphError(e, 'Error al crear reunión Teams');
      }
    }

    try {
      const newAct: Activity = {
        ...activityForm,
        id: `act-mock-${Date.now()}`,
        fecha: new Date(activityForm.fecha),
        fechaFin: activityForm.fechaFin ? new Date(activityForm.fechaFin) : undefined,
        linkReunion,
      };

      fetch(`/api/leads/${lead.id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...activityForm, linkReunion }),
      }).catch(err => console.warn('API Offline:', err));

      const updatedLead = syncLeadNextActivity({
        ...lead, ...form,
        actividades: [newAct, ...lead.actividades],
      });

      onLeadUpdate(updatedLead);
      await checkAndNotify(updatedLead);
      showToast('Actividad registrada', 'success');
      setActivityForm({
        tipo: 'reunion', estado: 'pendiente', nota: '',
        responsable: userName || 'Equipo Bioactiva',
        fecha: new Date().toISOString().slice(0, 10),
        fechaFin: new Date().toISOString().slice(0, 10),
      });
    } catch {
      showToast('Error al registrar actividad', 'error');
    } finally {
      setSavingActivity(false);
    }
  };

  const handleActivityStateChange = async (activityId: string, nextState: Activity['estado']) => {
    const updatedActivities = lead.actividades.map(a =>
      a.id === activityId
        ? { ...a, estado: nextState, fechaCompletada: nextState === 'realizada' ? new Date() : undefined }
        : a,
    );
    const updatedLead = syncLeadNextActivity({ ...lead, ...form, actividades: updatedActivities });
    onLeadUpdate(updatedLead);
    await checkAndNotify(updatedLead);
    showToast(nextState === 'realizada' ? 'Marcada como realizada' : 'Reabierta', 'success');
  };

  return (
    <div className="max-w-2xl w-full mx-auto animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-text-muted">{lead.id}</p>
          <h2 className="text-xl font-black text-text">{orgNombre}</h2>
          <p className="text-sm text-text-muted">{contactoNombre}</p>
        </div>
        <button onClick={onBack} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Volver al pipeline
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-app-bg p-1 rounded-xl border border-border-subtle w-fit">
        {(['detalle', 'actividades'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-bold transition-all capitalize',
              activeTab === tab ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text',
            )}
          >
            {tab === 'detalle' ? 'Detalle' : `Actividades (${lead.actividades.length})`}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface p-8 space-y-5">
        {/* ── Tab Detalle ── */}
        {activeTab === 'detalle' && (
          <>
            <div>
              <label className={labelClass}>Estado</label>
              <select value={merged.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value as Lead['estado'] }))} className={fieldClass}>
                {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Canal de captación</label>
                <input type="text" value={merged.canal ?? ''} onChange={e => setForm(f => ({ ...f, canal: e.target.value }))} className={fieldClass} placeholder="Email, referido, evento..." />
              </div>
              <div>
                <label className={labelClass}>Servicio de interés</label>
                <input type="text" value={merged.servicioInteres ?? ''} onChange={e => setForm(f => ({ ...f, servicioInteres: e.target.value }))} className={fieldClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Encargado</label>
                <select value={merged.encargado ?? ''} onChange={e => {
                  const u = users.find(mu => mu.name === e.target.value);
                  setForm(f => ({ ...f, encargado: e.target.value, encargadoEmail: u ? u.email : '' }));
                }} className={fieldClass}>
                  <option value="">Seleccionar...</option>
                  {users.filter(u => u.name !== 'Administración').map(u => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Fecha cierre estimada</label>
                <input type="date" value={merged.fechaCierre ? new Date(merged.fechaCierre).toISOString().split('T')[0] : ''} onChange={e => setForm(f => ({ ...f, fechaCierre: e.target.value ? new Date(e.target.value) : undefined }))} className={fieldClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Desafío u oportunidad</label>
              <textarea rows={3} value={merged.desafioOportunidad ?? ''} onChange={e => setForm(f => ({ ...f, desafioOportunidad: e.target.value }))} className={fieldClass} placeholder="Contexto del cliente..." />
            </div>

            <div>
              <label className={labelClass}>Notas de contacto</label>
              <textarea rows={3} value={merged.historial ?? ''} onChange={e => setForm(f => ({ ...f, historial: e.target.value }))} className={fieldClass} placeholder="Resumen de reuniones, correos..." />
            </div>

            <button onClick={handleSave} disabled={saving || Object.keys(form).length === 0} className="btn-primary w-full disabled:opacity-40">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><Save className="w-4 h-4" /> Guardar cambios</>}
            </button>

            {/* Seguimientos programados */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-bold text-text uppercase tracking-wider">Seguimientos programados</p>
              {scheduledActivities.length === 0 ? (
                <p className="text-sm text-text-muted italic">Sin seguimientos programados.</p>
              ) : (
                <div className="space-y-2">
                  {scheduledActivities.map(activity => {
                    const status = getActivityStatus(activity);
                    const badgeClass = { pendiente: 'bg-amber-100 text-amber-700', realizada: 'bg-green-100 text-green-700', vencida: 'bg-red-100 text-red-700' }[status];
                    return (
                      <div key={activity.id} className="p-4 bg-app-bg/40 border border-border-subtle rounded-xl space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-text">{activity.nota}</p>
                            <p className="text-[10px] text-text-muted uppercase tracking-wider mt-1">
                              {activity.tipo} · {new Date(activity.fecha).toLocaleDateString('es-PE')}
                            </p>
                          </div>
                          <span className={cn('px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider', badgeClass)}>{status}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs text-text-muted">Responsable: <span className="font-bold text-text">{activity.responsable}</span></p>
                          <div className="flex gap-2">
                            {activity.linkReunion && (
                              <a href={activity.linkReunion} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-[#5059C9] text-white rounded-lg text-xs font-bold hover:bg-[#4048A8] transition-colors">
                                Unirse
                              </a>
                            )}
                            {activity.estado !== 'realizada' ? (
                              <button onClick={() => handleActivityStateChange(activity.id, 'realizada')} className="btn-secondary py-2 text-xs">
                                <CheckCircle2 className="w-4 h-4" /> Marcar realizada
                              </button>
                            ) : (
                              <button onClick={() => handleActivityStateChange(activity.id, 'pendiente')} className="btn-secondary py-2 text-xs">
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
          </>
        )}

        {/* ── Tab Actividades ── */}
        {activeTab === 'actividades' && (
          <div className="space-y-6">
            <div className="bg-app-bg/40 rounded-2xl p-4 border border-border-subtle space-y-4">
              <p className="text-xs font-bold text-text uppercase tracking-wider">Programar actividad</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Tipo</label>
                  <select value={activityForm.tipo} onChange={e => setActivityForm(f => ({ ...f, tipo: e.target.value as Activity['tipo'] }))} className={fieldClass}>
                    {ACTIVITY_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Responsable</label>
                  <select value={activityForm.responsable} onChange={e => setActivityForm(f => ({ ...f, responsable: e.target.value }))} className={fieldClass}>
                    <option value="">Seleccionar...</option>
                    {users.filter(u => u.name !== 'Administración').map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Estado inicial</label>
                  <select value={activityForm.estado} onChange={e => setActivityForm(f => ({ ...f, estado: e.target.value as Activity['estado'] }))} className={fieldClass}>
                    {ACTIVITY_ESTADOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Fecha de inicio</label>
                  <input type="date" value={activityForm.fecha} onChange={e => setActivityForm(f => ({ ...f, fecha: e.target.value }))} className={fieldClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Fecha de fin</label>
                  <input type="date" value={activityForm.fechaFin} onChange={e => setActivityForm(f => ({ ...f, fechaFin: e.target.value }))} className={fieldClass} />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={async () => {
                      if (tabEventAdded || addingTabEvent) return;
                      setAddingTabEvent(true);
                      try {
                        const start = new Date(activityForm.fecha);
                        const end = activityForm.fechaFin ? new Date(activityForm.fechaFin) : new Date(start.getTime() + 60 * 60 * 1000);
                        const attendees = contactoEmail ? [{ emailAddress: { address: contactoEmail, name: contactoNombre || undefined }, type: 'required' as const }] : [];
                        await callGraph('/me/events', {
                          method: 'POST',
                          body: {
                            subject: activityForm.nota || `Actividad ${activityForm.tipo}`,
                            body: { contentType: 'HTML', content: `<p><strong>Lead:</strong> ${lead.id}</p>` },
                            start: { dateTime: start.toISOString(), timeZone: 'America/Lima' },
                            end:   { dateTime: end.toISOString(),   timeZone: 'America/Lima' },
                            attendees,
                          },
                        });
                        setTabEventAdded(true);
                        showToast(attendees.length ? `Evento agregado · invitación a ${contactoNombre || contactoEmail}` : 'Evento agregado a Outlook', 'success');
                      } catch (e) {
                        handleGraphError(e, 'No se pudo agregar a Outlook');
                      } finally {
                        setAddingTabEvent(false);
                      }
                    }}
                    disabled={addingTabEvent || tabEventAdded}
                    className={cn(
                      'w-full text-xs font-bold rounded-xl px-3 py-2.5 transition-all flex items-center justify-center gap-2',
                      tabEventAdded ? 'bg-green-600 text-white cursor-not-allowed' : 'text-primary border border-primary hover:bg-primary/10',
                    )}
                  >
                    {addingTabEvent ? 'Agregando...' : tabEventAdded ? '✓ Agregado a Outlook' : '+ Outlook Calendar'}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelClass}>Actividad o notas del contacto</label>
                <textarea rows={3} value={activityForm.nota} onChange={e => setActivityForm(f => ({ ...f, nota: e.target.value }))} className={fieldClass} placeholder="¿Qué se conversó con el cliente?" />
              </div>

              {activityForm.tipo === 'reunion' && !isConnected && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs text-blue-800 font-medium">Conecta tu cuenta Microsoft para generar reuniones de Teams.</p>
                  <Link href="/profile" className="text-xs font-bold text-blue-600 hover:underline">Ir a configuración →</Link>
                </div>
              )}

              <button
                onClick={handleAddActivity}
                disabled={savingActivity || !activityForm.nota.trim()}
                className={cn('w-full disabled:opacity-40', activityForm.tipo === 'reunion' && isConnected ? 'bg-[#5059C9] hover:bg-[#4048A8] text-white py-3 rounded-xl font-semibold shadow-sm transition-all' : 'btn-primary')}
              >
                {savingActivity
                  ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Guardando...</>
                  : activityForm.tipo === 'reunion' && isConnected
                    ? <span className="flex items-center justify-center gap-2">Crear reunión de Teams</span>
                    : <><Plus className="w-4 h-4 inline mr-2" /> Registrar actividad</>
                }
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-text uppercase tracking-wider mb-3">Historial</p>
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
          </div>
        )}
      </div>
    </div>
  );
}
