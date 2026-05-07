'use client';

import { useState } from 'react';
import { Save, Calendar, Plus, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import type { Lead, Activity } from '@/src/types/crm';
import Drawer from '@/src/components/ui/Drawer';
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

interface LeadPanelProps {
  lead: Lead | null;
  orgNombre: string;
  contactoNombre: string;
  /**
   * Email del contacto vinculado al lead. Cuando se crea una reunión
   * Teams desde la pestaña Actividades, se incluye automáticamente como
   * invitado (recibe la invitación oficial con Aceptar/Rechazar).
   */
  contactoEmail?: string;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdate: (updated: Lead) => void;
}

export default function LeadPanel({
  lead,
  orgNombre,
  contactoNombre,
  contactoEmail,
  isOpen,
  onClose,
  onLeadUpdate,
}: LeadPanelProps) {
  const { userName } = useAuthStore();
  const { showToast } = useToast();
  const { users } = useUsersStore();
  const { callGraph, isConnected } = useMsGraph();

  const [activeTab, setActiveTab] = useState<'detalle' | 'actividades'>('detalle');
  const [saving, setSaving] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [eventAdded, setEventAdded] = useState(false);
  const [addingTabEvent, setAddingTabEvent] = useState(false);
  const [tabEventAdded, setTabEventAdded] = useState(false);

  // Editable fields mirror from lead
  const [form, setForm] = useState<Partial<Lead>>({});
  const [activityForm, setActivityForm] = useState({
    tipo: 'reunion' as Activity['tipo'],
    estado: 'pendiente' as Activity['estado'],
    nota: '',
    responsable: userName || 'Equipo Bioactiva',
    fecha: new Date().toISOString().slice(0, 10),
    fechaFin: new Date().toISOString().slice(0, 10),
  });

  /**
   * Convierte un error de Graph en un toast legible para el usuario.
   * Centraliza los 3 casos típicos: no conectado, sin consentimiento,
   * y errores genéricos con código.
   */
  const handleGraphError = (err: unknown, fallbackMsg: string): void => {
    if (err instanceof MsNotConnectedError) {
      showToast('Conecta tu cuenta Microsoft en tu perfil para usar esta función', 'error');
      return;
    }
    if (err instanceof MsConsentRequiredError) {
      showToast(
        'Esta función requiere permisos de Microsoft 365 que el administrador del tenant debe aprobar',
        'error',
      );
      return;
    }
    const msg = err instanceof Error ? err.message : fallbackMsg;
    showToast(msg, 'error');
  };

  if (!lead) return null;

  // Merged view: original fields overridden by any local edits
  const merged = { ...lead, ...form };

  const handleSave = async () => {
    if (!lead) return;
    // Si el usuario llena la próxima actividad, también debe poner la fecha
    // (y viceversa). La fecha de cierre es independiente.
    const hasProx = !!form.proximaActividad || !!form.fechaProximaActividad;
    if (hasProx) {
      if (!merged.proximaActividad || !merged.fechaProximaActividad) {
        showToast('Si llenas próxima actividad, su fecha también es obligatoria', 'error');
        return;
      }
    }
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
      if (updated.estado === 'cerrado_ganado' && lead.estado !== 'cerrado_ganado') {
        const { addNotification } = useNotificationStore.getState();
        addNotification({
          tipo: 'lead_cerrado',
          titulo: '🎉 ¡Cierre con venta!',
          mensaje: `El lead de ${orgNombre || 'la organización'} fue cerrado exitosamente.`,
          destinatario: { tipo: 'global' },
          linkUrl: '/pipeline'
        });
      }
      showToast('Cambios guardados correctamente', 'success');
      setForm({});
    } catch {
      showToast('Error al guardar los cambios', 'error');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Helper compartido por los dos botones "+ Outlook Calendar" del panel
   * (uno en la pestaña Detalle, otro en Actividades). Crea un evento de
   * Outlook con la próxima actividad del lead, invitando al contacto si
   * tiene email registrado.
   */
  const addOutlookEventForNextActivity = async (): Promise<boolean> => {
    if (!merged.fechaProximaActividad) return false;
    try {
      const start = new Date(merged.fechaProximaActividad);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hora

      const attendees: Array<{
        emailAddress: { address: string; name?: string };
        type: 'required' | 'optional';
      }> = [];
      if (contactoEmail) {
        attendees.push({
          emailAddress: { address: contactoEmail, name: contactoNombre || undefined },
          type: 'required',
        });
      }

      await callGraph('/me/events', {
        method: 'POST',
        body: {
          subject: merged.proximaActividad || 'Seguimiento programado',
          body: {
            contentType: 'HTML',
            content:
              `<p><strong>Lead:</strong> ${lead.id}</p>` +
              `<p><strong>Organización:</strong> ${orgNombre || '—'}</p>` +
              (merged.encargado
                ? `<p><strong>Encargado:</strong> ${merged.encargado}</p>`
                : ''),
          },
          start: { dateTime: start.toISOString(), timeZone: 'America/Lima' },
          end:   { dateTime: end.toISOString(),   timeZone: 'America/Lima' },
          attendees,
        },
      });

      const msg = attendees.length
        ? `Evento agregado a Outlook · invitación enviada a ${contactoNombre || contactoEmail}`
        : 'Evento agregado a tu calendario de Outlook';
      showToast(msg, 'success');
      return true;
    } catch (e) {
      handleGraphError(e, 'No se pudo agregar a Outlook');
      return false;
    }
  };

  const handleAddActivity = async () => {
    if (!lead || !activityForm.nota.trim()) return;
    setSavingActivity(true);

    let linkReunion: string | undefined = undefined;

    /**
     * Para actividades tipo "reunión" con Microsoft conectado:
     * 1 sola llamada a /me/events con `isOnlineMeeting: true` que:
     *   - Crea el evento en el calendario Outlook del usuario
     *   - Adjunta una reunión Teams (joinUrl viene en la respuesta)
     *   - Invita al contacto del lead por email (si tiene correo)
     *   - El cliente recibe invitación oficial con Aceptar/Rechazar
     *
     * Antes eran 2 llamadas (Teams + Outlook) descoordinadas y la
     * reunión duraba 0 minutos. Ahora respeta fechaFin y dura mínimo
     * 30 minutos si fechaInicio === fechaFin.
     */
    if (activityForm.tipo === 'reunion' && isConnected) {
      try {
        const start = new Date(activityForm.fecha);
        let end = activityForm.fechaFin
          ? new Date(activityForm.fechaFin)
          : new Date(start);
        // Si el usuario no marcó fechaFin (o coincide), agendar 30 min
        if (end.getTime() <= start.getTime()) {
          end = new Date(start.getTime() + 30 * 60 * 1000);
        }

        // Construir lista de invitados: el contacto del lead, si tiene
        // email registrado.
        const attendees: Array<{
          emailAddress: { address: string; name?: string };
          type: 'required' | 'optional';
        }> = [];
        if (contactoEmail) {
          attendees.push({
            emailAddress: { address: contactoEmail, name: contactoNombre || undefined },
            type: 'required',
          });
        }

        type GraphEventResponse = {
          id: string;
          onlineMeeting?: { joinUrl?: string };
        };

        const event = await callGraph<GraphEventResponse>('/me/events', {
          method: 'POST',
          body: {
            subject: `${activityForm.nota} — ${orgNombre || lead.id}`,
            body: {
              contentType: 'HTML',
              content:
                `<p><strong>Lead:</strong> ${lead.id}</p>` +
                `<p><strong>Organización:</strong> ${orgNombre || '—'}</p>` +
                (lead.servicioInteres
                  ? `<p><strong>Servicio:</strong> ${lead.servicioInteres}</p>`
                  : '') +
                `<p><strong>Encargado:</strong> ${activityForm.responsable}</p>` +
                (activityForm.nota
                  ? `<hr/><p>${activityForm.nota}</p>`
                  : ''),
            },
            start: { dateTime: start.toISOString(), timeZone: 'America/Lima' },
            end:   { dateTime: end.toISOString(),   timeZone: 'America/Lima' },
            isOnlineMeeting: true,
            onlineMeetingProvider: 'teamsForBusiness',
            attendees,
          },
        });

        linkReunion = event.onlineMeeting?.joinUrl;
        if (!linkReunion) {
          showToast(
            'Reunión creada pero no se obtuvo el link de Teams. Revisa Outlook.',
            'error',
          );
        } else if (attendees.length > 0) {
          showToast(`Invitación enviada a ${contactoNombre || contactoEmail}`, 'success');
        }
      } catch (e) {
        handleGraphError(e, 'Error al crear la reunión Teams');
        // Continuamos: la activity se registra igual, sin link de reunión
      }
    }

    try {
      const res = await fetch(`/api/leads/${lead.id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...activityForm, linkReunion }),
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
        fechaFin: new Date().toISOString().slice(0, 10),
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

  const fieldClass = 'w-full px-3 py-2.5 bg-app-bg/40 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all';
  const labelClass = 'text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1';
  const scheduledActivities = [...lead.actividades].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Lead — ${orgNombre}`}
      width="w-[45%]"
      transparentBackground
    >
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

          <div className="space-y-4">
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
              <select
                value={merged.encargado ?? ''}
                onChange={e => {
                  const val = e.target.value;
                  const u = users.find(mu => mu.name === val);
                  setForm(f => ({ ...f, encargado: val, encargadoEmail: u ? u.email : '' }));
                }}
                className={fieldClass}
              >
                <option value="">Seleccionar...</option>
                {users.filter(u => u.name !== 'Administración').map(u => (
                  <option key={u.id} value={u.name}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Email encargado */}
            <div>
              <label className={labelClass}>Email encargado</label>
              <input
                type="email"
                value={merged.encargadoEmail ?? ''}
                readOnly
                className={cn(fieldClass, "opacity-70 cursor-not-allowed")}
                placeholder="Auto..."
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

          <div className="bg-app-bg/40 rounded-2xl p-4 border border-border-subtle space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Próximo seguimiento</p>
                <p className="text-sm font-bold text-text mt-1">{merged.proximaActividad || 'Sin seguimiento programado'}</p>
              </div>
              <button
                onClick={() => setActiveTab('actividades')}
                className="text-[10px] font-bold text-primary uppercase tracking-wider hover:underline transition-all"
              >
                Se gestiona en Actividades
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Fecha próxima actividad</p>
                <p className="text-sm text-text mt-1">
                  {merged.fechaProximaActividad
                    ? new Date(merged.fechaProximaActividad).toLocaleDateString('es-PE')
                    : '—'}
                </p>
                {merged.fechaProximaActividad && (
                  <button
                    onClick={async () => {
                      if (eventAdded || addingEvent) return;
                      setAddingEvent(true);
                      const ok = await addOutlookEventForNextActivity();
                      if (ok) setEventAdded(true);
                      setAddingEvent(false);
                    }}
                    disabled={addingEvent || eventAdded}
                    className={cn(
                      'mt-3 w-full text-xs font-bold rounded-xl px-3 py-2.5 transition-all flex items-center justify-center gap-2',
                      eventAdded
                        ? 'bg-green-600 text-white border-green-600 cursor-not-allowed shadow-md'
                        : 'text-primary border border-primary hover:bg-primary/10',
                    )}
                  >
                    <Calendar className="w-4 h-4" />
                    {addingEvent
                      ? 'Agregando...'
                      : eventAdded
                        ? '✓ Agregado a Outlook'
                        : '+ Outlook Calendar'}
                  </button>
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

          {/* Notas de Contacto */}
          <div>
            <label className={labelClass}>Notas de Contacto</label>
            <textarea
              rows={3}
              value={merged.historial ?? ''}
              onChange={e => setForm(f => ({ ...f, historial: e.target.value }))}
              className={fieldClass}
              placeholder="Escribe una nota visible para todos los colaboradores..."
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
                <select
                  value={activityForm.responsable}
                  onChange={e => setActivityForm(f => ({ ...f, responsable: e.target.value }))}
                  className={fieldClass}
                >
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
                <select
                  value={activityForm.estado}
                  onChange={e => setActivityForm(f => ({ ...f, estado: e.target.value as Activity['estado'] }))}
                  className={fieldClass}
                >
                  {ACTIVITY_ESTADOS.map(state => <option key={state.value} value={state.value}>{state.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Fecha de inicio</label>
                <input
                  type="date"
                  value={activityForm.fecha}
                  onChange={e => setActivityForm(f => ({ ...f, fecha: e.target.value }))}
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Fecha de fin</label>
                <input
                  type="date"
                  value={activityForm.fechaFin}
                  onChange={e => setActivityForm(f => ({ ...f, fechaFin: e.target.value }))}
                  className={fieldClass}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={async () => {
                    if (tabEventAdded || addingTabEvent) return;
                    setAddingTabEvent(true);
                    try {
                      const start = new Date(activityForm.fecha);
                      const end = activityForm.fechaFin
                        ? new Date(activityForm.fechaFin)
                        : new Date(start.getTime() + 60 * 60 * 1000);

                      const attendees: Array<{
                        emailAddress: { address: string; name?: string };
                        type: 'required' | 'optional';
                      }> = [];
                      if (contactoEmail) {
                        attendees.push({
                          emailAddress: { address: contactoEmail, name: contactoNombre || undefined },
                          type: 'required',
                        });
                      }

                      await callGraph('/me/events', {
                        method: 'POST',
                        body: {
                          subject: activityForm.nota || `Actividad ${activityForm.tipo}`,
                          body: {
                            contentType: 'HTML',
                            content:
                              `<p><strong>Lead:</strong> ${lead.id}</p>` +
                              `<p><strong>Organización:</strong> ${orgNombre || '—'}</p>` +
                              (activityForm.nota
                                ? `<hr/><p>${activityForm.nota}</p>`
                                : ''),
                          },
                          start: { dateTime: start.toISOString(), timeZone: 'America/Lima' },
                          end:   { dateTime: end.toISOString(),   timeZone: 'America/Lima' },
                          attendees,
                        },
                      });
                      setTabEventAdded(true);
                      showToast(
                        attendees.length
                          ? `Evento agregado · invitación enviada a ${contactoNombre || contactoEmail}`
                          : 'Evento agregado a tu calendario de Outlook',
                        'success',
                      );
                    } catch (e) {
                      handleGraphError(e, 'No se pudo agregar a Outlook');
                    } finally {
                      setAddingTabEvent(false);
                    }
                  }}
                  disabled={addingTabEvent || tabEventAdded}
                  className={cn(
                    'w-full text-xs font-bold rounded-xl px-3 py-2.5 transition-all flex items-center justify-center gap-2',
                    tabEventAdded
                      ? 'bg-green-600 text-white border-green-600 cursor-not-allowed shadow-md'
                      : 'text-primary border border-primary hover:bg-primary/10',
                  )}
                >
                  {addingTabEvent
                    ? 'Agregando...'
                    : tabEventAdded
                      ? '✓ Agregado a Outlook'
                      : '+ Outlook Calendar'}
                </button>
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

            {activityForm.tipo === 'reunion' && !isConnected && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex flex-col gap-2">
                <p className="text-xs text-blue-800 font-medium">
                  Conecta tu cuenta Microsoft para generar reuniones de Teams automáticamente.
                </p>
                <Link href="/profile" className="text-xs font-bold text-blue-600 hover:underline">
                  Ir a configuración →
                </Link>
              </div>
            )}

            <button
              onClick={handleAddActivity}
              disabled={savingActivity || !activityForm.nota.trim()}
              className={cn(
                "w-full disabled:opacity-40",
                activityForm.tipo === 'reunion' && isConnected ? "bg-[#5059C9] hover:bg-[#4048A8] text-white py-3 rounded-xl font-semibold shadow-sm transition-all" : "btn-primary"
              )}
            >
              {savingActivity
                ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Guardando...</>
                : activityForm.tipo === 'reunion' && isConnected 
                  ? <span className="flex items-center justify-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 6C14 7.65685 12.6569 9 11 9C9.34315 9 8 7.65685 8 6C8 4.34315 9.34315 3 11 3C12.6569 3 14 4.34315 14 6Z" fill="#FFF"/><path d="M20 7C20 8.10457 19.1046 9 18 9C16.8954 9 16 8.10457 16 7C16 5.89543 16.8954 5 18 5C19.1046 5 20 5.89543 20 7Z" fill="#EAEBFA"/><path d="M14 14.5C14 16.9853 11.9853 19 9.5 19C7.01472 19 5 16.9853 5 14.5C5 12.567 6.25329 10.9262 8 10.25V10H11C12.6569 10 14 11.3431 14 13V14.5Z" fill="#FFF"/><path d="M19.5 18C18.6716 18 18 17.3284 18 16.5V13.5C18 12.6716 17.3284 12 16.5 12H13.75C14.5267 12.6738 15 13.5284 15 14.5V16C15 17.1046 15.8954 18 17 18H19.5Z" fill="#EAEBFA"/></svg> Crear reunión de Teams</span>
                  : <><Plus className="w-4 h-4 inline mr-2" /> Registrar actividad</>
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
                          {activity.linkReunion && (
                            <a
                              href={activity.linkReunion}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-[#5059C9] text-white rounded-lg text-xs font-bold hover:bg-[#4048A8] transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 6C14 7.65685 12.6569 9 11 9C9.34315 9 8 7.65685 8 6C8 4.34315 9.34315 3 11 3C12.6569 3 14 4.34315 14 6Z" fill="#FFF"/><path d="M20 7C20 8.10457 19.1046 9 18 9C16.8954 9 16 8.10457 16 7C16 5.89543 16.8954 5 18 5C19.1046 5 20 5.89543 20 7Z" fill="#EAEBFA"/><path d="M14 14.5C14 16.9853 11.9853 19 9.5 19C7.01472 19 5 16.9853 5 14.5C5 12.567 6.25329 10.9262 8 10.25V10H11C12.6569 10 14 11.3431 14 13V14.5Z" fill="#FFF"/><path d="M19.5 18C18.6716 18 18 17.3284 18 16.5V13.5C18 12.6716 17.3284 12 16.5 12H13.75C14.5267 12.6738 15 13.5284 15 14.5V16C15 17.1046 15.8954 18 17 18H19.5Z" fill="#EAEBFA"/></svg>
                              Unirse
                            </a>
                          )}
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
