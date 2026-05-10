'use client';

import { useState } from 'react';
import { Save, Plus, Loader2, CheckCircle2, RotateCcw, ArrowLeft, Bell, Send, XCircle } from 'lucide-react';
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
import { useLeadNotificationStore } from '@/src/store/leadNotificationStore';
import { useEmailTemplateStore } from '@/src/store/emailTemplateStore';
import { getEstadoNotificacion } from '@/src/types/leadNotification';
import { sendEmail } from '@/src/server/actions/sendEmail';
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
  contactoEmail2?: string;
  onBack: () => void;
  onLeadUpdate: (updated: Lead) => void;
}

export default function LeadEditView({
  lead,
  orgNombre,
  contactoNombre,
  contactoEmail,
  contactoEmail2,
  onBack,
  onLeadUpdate,
}: LeadEditViewProps) {
  const { userName } = useAuthStore();
  const { showToast } = useToast();
  const { users } = useUsersStore();
  const { callGraph, isConnected } = useMsGraph();

  const [activeTab, setActiveTab] = useState<'detalle' | 'actividades' | 'notificacion'>('detalle');
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

  const { notifications: leadNotifs, create: createNotif, cancel: cancelNotif, hasActiveForActivity } = useLeadNotificationStore();
  const { templates: emailTemplates } = useEmailTemplateStore();

  const mkDefaultNotifForm = () => ({
    activityId: '',
    tipo: 'recordatorio' as 'recordatorio' | 'seguimiento',
    // Correo al responsable (recordatorio: único; seguimiento: correo interno)
    templateId: '',
    asuntoEditado: '',
    cuerpoEditado: '',
    fechaProgramada: new Date().toISOString().slice(0, 10),
    horaProgramada: '09:00',
    // Solo seguimiento — correo externo al cliente
    templateClienteId: '',
    asuntoClienteEditado: '',
    cuerpoClienteEditado: '',
    fechaCliente: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    horaCliente: '09:00',
    emailClienteSeleccionado: contactoEmail ?? '',
  });
  const [notifForm, setNotifForm] = useState(mkDefaultNotifForm);
  const [sendingNotif, setSendingNotif] = useState(false);

  // Solo recordatorios programados — enviadas y canceladas no aparecen aquí
  const activeNotifsForLead = leadNotifs.filter(n => n.leadId === lead.id && n.estadoBase === 'programada');

  // Actividades sin notificación activa (disponibles para crear)
  const availableActivities = lead.actividades.filter(
    a => !hasActiveForActivity(lead.id, a.id),
  );

  // Actividades vencidas sin notificación (alerta inteligente)
  const vencidasSinNotif = availableActivities.filter(
    a => getActivityStatus(a) === 'vencida',
  );

  const selectedActivity = lead.actividades.find(a => a.id === notifForm.activityId);

  // Plantillas filtradas por tipo de notificación seleccionado
  const templatesForTipo = emailTemplates.filter(t =>
    t.estado === 'activa' && (t.uso === notifForm.tipo || t.uso === 'ambos'),
  );

  const resolveVars = (text: string, fecha: string) =>
    text
      .replace(/\{\{nombre_contacto\}\}/g, contactoNombre)
      .replace(/\{\{nombre_organizacion\}\}/g, orgNombre)
      .replace(/\{\{servicio_interes\}\}/g, lead.servicioInteres ?? '')
      .replace(/\{\{nombre_encargado\}\}/g, lead.encargado ?? '')
      .replace(/\{\{fecha_actividad\}\}/g, fecha ? new Date(fecha).toLocaleDateString('es-PE') : '');

  const selectedTemplate = emailTemplates.find(t => t.id === notifForm.templateId);
  const selectedTemplateCliente = emailTemplates.find(t => t.id === notifForm.templateClienteId);
  // Los valores editables son la fuente de verdad para el envío
  const previewAsunto = notifForm.asuntoEditado;
  const previewCuerpo = notifForm.cuerpoEditado;
  const leadLink = `\n\n—\nVer actividad en el CRM: http://localhost:3000/pipeline?leadId=${lead.id}`;

  const handleTemplateChange = (templateId: string) => {
    const tpl = emailTemplates.find(t => t.id === templateId);
    if (!tpl) { setNotifForm(f => ({ ...f, templateId, asuntoEditado: '', cuerpoEditado: '' })); return; }
    const cuerpoBase = resolveVars(tpl.cuerpo, notifForm.fechaProgramada);
    setNotifForm(f => ({
      ...f, templateId,
      asuntoEditado: resolveVars(tpl.asunto, f.fechaProgramada),
      cuerpoEditado: cuerpoBase + leadLink,
    }));
  };

  const handleTemplateClienteChange = (templateId: string) => {
    const tpl = emailTemplates.find(t => t.id === templateId);
    if (!tpl) { setNotifForm(f => ({ ...f, templateClienteId: templateId, asuntoClienteEditado: '', cuerpoClienteEditado: '' })); return; }
    setNotifForm(f => ({
      ...f, templateClienteId: templateId,
      asuntoClienteEditado: resolveVars(tpl.asunto, f.fechaCliente),
      cuerpoClienteEditado: resolveVars(tpl.cuerpo, f.fechaCliente),
    }));
  };

  const handleTipoChange = (tipo: 'recordatorio' | 'seguimiento') => {
    setNotifForm(f => ({
      ...f, tipo,
      templateId: '', asuntoEditado: '', cuerpoEditado: '',
      templateClienteId: '', asuntoClienteEditado: '', cuerpoClienteEditado: '',
    }));
  };

  const handleSendNotif = async () => {
    if (!notifForm.activityId) { showToast('Selecciona una actividad', 'error'); return; }
    if (!notifForm.templateId) { showToast('Selecciona una plantilla para el correo al responsable', 'error'); return; }
    if (!notifForm.fechaProgramada) { showToast('Selecciona una fecha', 'error'); return; }

    // Fecha recordatorio debe estar antes de fechaFin de la actividad
    if (notifForm.tipo === 'recordatorio' && selectedActivity?.fechaFin) {
      const fin = new Date(selectedActivity.fechaFin);
      const prog = new Date(notifForm.fechaProgramada);
      if (prog > fin) {
        showToast('El recordatorio debe programarse antes de la fecha de fin de la actividad', 'error');
        return;
      }
    }

    // Validaciones específicas de seguimiento
    if (notifForm.tipo === 'seguimiento') {
      const emailCliente = notifForm.emailClienteSeleccionado || contactoEmail;
      if (!emailCliente) { showToast('Este lead no tiene email de contacto registrado', 'error'); return; }
      if (!notifForm.templateClienteId) { showToast('Selecciona una plantilla para el correo al cliente', 'error'); return; }
      const fechaInterno = new Date(`${notifForm.fechaProgramada}T${notifForm.horaProgramada}`);
      const fechaClienteDt = new Date(`${notifForm.fechaCliente}T${notifForm.horaCliente}`);
      if (fechaClienteDt <= fechaInterno) {
        showToast('El correo al cliente debe programarse después del correo interno al responsable', 'error');
        return;
      }
    }

    setSendingNotif(true);
    try {
      const fechaConHora = (() => {
        const d = new Date(notifForm.fechaProgramada);
        const [hh, mm] = notifForm.horaProgramada.split(':').map(Number);
        d.setHours(hh, mm, 0, 0);
        return d;
      })();

      const fechaClienteConHora = notifForm.tipo === 'seguimiento'
        ? (() => {
            const d = new Date(notifForm.fechaCliente);
            const [hh, mm] = notifForm.horaCliente.split(':').map(Number);
            d.setHours(hh, mm, 0, 0);
            return d;
          })()
        : undefined;

      const emailClienteFinal = notifForm.tipo === 'seguimiento'
        ? (notifForm.emailClienteSeleccionado || contactoEmail || '')
        : undefined;

      createNotif({
        leadId: lead.id,
        activityId: notifForm.activityId,
        activityNota: selectedActivity?.nota ?? '',
        orgNombre,
        contactoNombre,
        tipo: notifForm.tipo,
        templateId: selectedTemplate!.id,
        templateNombre: selectedTemplate!.nombre,
        asuntoResuelto: previewAsunto,
        cuerpoResuelto: previewCuerpo,
        fechaProgramada: fechaConHora,
        emailResponsable: lead.encargadoEmail ?? '',
        nombreResponsable: lead.encargado ?? '',
        emailCliente: emailClienteFinal,
        creadoPor: userName ?? '',
        ...(notifForm.tipo === 'seguimiento' && {
          templateClienteId: notifForm.templateClienteId,
          templateClienteNombre: selectedTemplateCliente?.nombre,
          asuntoClienteResuelto: notifForm.asuntoClienteEditado,
          cuerpoClienteResuelto: notifForm.cuerpoClienteEditado,
          fechaCliente: fechaClienteConHora,
        }),
      });

      // Simulación mock — intenta enviar, no bloquea si falla
      if (notifForm.tipo === 'seguimiento') {
        sendEmail({ to: lead.encargadoEmail || '', subject: previewAsunto, body: previewCuerpo })
          .catch(() => {});
      }

      showToast(
        notifForm.tipo === 'seguimiento'
          ? 'Seguimiento programado — los correos se enviarán en las fechas definidas'
          : 'Recordatorio guardado — aparecerá en tu Centro de Notificaciones',
        'success',
      );
      setNotifForm(mkDefaultNotifForm());
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al guardar', 'error');
    } finally {
      setSendingNotif(false);
    }
  };

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

    // Al completar una actividad, cancelar automáticamente su notificación activa
    if (nextState === 'realizada') {
      const notifActiva = leadNotifs.find(
        n => n.leadId === lead.id && n.activityId === activityId && n.estadoBase === 'programada',
      );
      if (notifActiva) cancelNotif(notifActiva.id);
    }

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
        <button
          onClick={() => setActiveTab('detalle')}
          className={cn('px-5 py-2 rounded-lg text-sm font-bold transition-all', activeTab === 'detalle' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text')}
        >
          Detalle
        </button>
        <button
          onClick={() => setActiveTab('actividades')}
          className={cn('px-5 py-2 rounded-lg text-sm font-bold transition-all', activeTab === 'actividades' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text')}
        >
          Actividades ({lead.actividades.length})
        </button>
        <button
          onClick={() => setActiveTab('notificacion')}
          className={cn(
            'px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5',
            activeTab === 'notificacion' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text',
          )}
        >
          <Bell className="w-3.5 h-3.5" />
          Notificación
          {activeNotifsForLead.length > 0 && <span className="w-2 h-2 rounded-full bg-primary" />}
        </button>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface p-8 space-y-5">
        {/* ── Tab Detalle ── */}
        {activeTab === 'detalle' && (() => {
          const lastAct = lead.actividades.length > 0
            ? Math.max(...lead.actividades.map(a => new Date(a.fecha).getTime()))
            : 0;
          const refDate = lastAct > 0 ? lastAct : (lead.creadoEn ? new Date(lead.creadoEn).getTime() : Date.now());
          const daysSince = Math.floor((Date.now() - refDate) / 86_400_000);
          const showInactivity = daysSince >= 30 && !['cerrado_ganado', 'cerrado_perdido'].includes(lead.estado ?? '');
          return (
          <>
            {showInactivity && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="text-sm font-bold text-amber-800">Lead inactivo hace {daysSince} días</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Este lead lleva más de 30 días sin cambio de estado. Se ha generado una alerta automática para el encargado.
                  </p>
                </div>
              </div>
            )}
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
          );
        })()}

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

        {/* ── Tab Notificación ── */}
        {activeTab === 'notificacion' && (
          <div className="space-y-5">

            {/* Lista de notificaciones activas por actividad */}
            {activeNotifsForLead.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Notificaciones</p>
                {activeNotifsForLead.map(n => {
                  const estado = getEstadoNotificacion(n);
                  const cardClass = estado === 'vencida'
                    ? 'bg-red-50 border-red-200'
                    : estado === 'enviada'
                      ? 'bg-purple-50 border-purple-200'
                      : 'bg-green-50 border-green-200';
                  const estadoBadgeClass = estado === 'vencida'
                    ? 'bg-red-100 text-red-700'
                    : estado === 'enviada'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-green-100 text-green-700';
                  return (
                    <div key={n.id} className={cn('rounded-2xl border p-4 space-y-2', cardClass)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black uppercase', n.tipo === 'recordatorio' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>
                              {n.tipo === 'recordatorio' ? '🔔 Recordatorio' : '📤 Seguimiento'}
                            </span>
                            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black uppercase', estadoBadgeClass)}>
                              {estado}
                            </span>
                          </div>
                          <p className="text-xs text-text-muted">
                            Actividad: <span className="font-semibold text-text">{n.activityNota}</span>
                          </p>
                          <p className="text-sm font-bold text-text truncate">{n.asuntoResuelto}</p>
                          <p className="text-xs text-text-muted">
                            Plantilla: {n.templateNombre} · {new Date(n.fechaProgramada).toLocaleDateString('es-PE')}
                          </p>
                          <p className="text-[10px] text-text-muted">
                            Responsable: <span className="font-semibold text-text">{n.nombreResponsable}</span>
                            {n.nombreResponsable !== userName && (
                              <span className="ml-1 text-amber-600">(visible solo en sus notificaciones globales)</span>
                            )}
                          </p>
                          {n.emailCliente && (
                            <p className="text-[10px] text-text-muted">Cliente: {n.emailCliente}</p>
                          )}
                        </div>
                        {estado !== 'enviada' && (
                          <button
                            onClick={() => { cancelNotif(n.id); showToast('Notificación cancelada', 'success'); }}
                            className="shrink-0 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors"
                            title="Cancelar"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sin actividades registradas */}
            {lead.actividades.length === 0 && (
              <div className="text-center py-8 bg-app-bg/30 rounded-2xl border border-dashed border-border-subtle">
                <Bell className="w-8 h-8 text-text-muted/30 mx-auto mb-2" />
                <p className="text-sm font-bold text-text-muted">Sin actividades registradas</p>
                <p className="text-xs text-text-muted mt-1">Registra una actividad primero para crear una notificación.</p>
              </div>
            )}

            {/* Actividades vencidas sin notificación */}
            {vencidasSinNotif.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                  ⚠️ Actividades vencidas sin notificación
                </p>
                <div className="space-y-1.5">
                  {vencidasSinNotif.map(a => (
                    <button
                      key={a.id}
                      onClick={() => {
                        // Auto-selecciona seguimiento + mejor plantilla por tipo de actividad
                        const candidatas = emailTemplates.filter(
                          t => t.estado === 'activa' && (t.uso === 'seguimiento' || t.uso === 'ambos'),
                        );
                        const bestTemplate =
                          candidatas.find(t => t.categoria === a.tipo) ??
                          candidatas.find(t => t.id === 'TPL-006') ??
                          candidatas[0];
                        setNotifForm(f => ({
                          ...f,
                          activityId: a.id,
                          tipo: 'seguimiento',
                          templateId: bestTemplate?.id ?? '',
                        }));
                      }}
                      className={cn(
                        'w-full text-left p-3 rounded-xl border transition-all',
                        notifForm.activityId === a.id
                          ? 'bg-amber-200 border-amber-400'
                          : 'bg-amber-100 border-amber-200 hover:bg-amber-200',
                      )}
                    >
                      <p className="text-xs font-semibold text-amber-900 truncate">{a.nota}</p>
                      <p className="text-[10px] text-amber-700 mt-0.5">
                        {a.tipo} · {new Date(a.fecha).toLocaleDateString('es-PE')} · vencida
                      </p>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-amber-600">Selecciona una para crear su notificación rápidamente.</p>
              </div>
            )}

            {/* Formulario nueva notificación */}
            {lead.actividades.length > 0 && availableActivities.length > 0 && (
              <div className="bg-app-bg/40 rounded-2xl p-5 border border-border-subtle space-y-4">
                <p className="text-xs font-bold text-text uppercase tracking-wider">Nueva notificación</p>

                {/* Actividad */}
                <div>
                  <label className={labelClass}>Actividad <span className="text-red-500">*</span></label>
                  <select
                    value={notifForm.activityId}
                    onChange={e => setNotifForm(f => ({ ...f, activityId: e.target.value }))}
                    className={fieldClass}
                  >
                    <option value="">Seleccionar actividad...</option>
                    {availableActivities.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nota} · {new Date(a.fecha).toLocaleDateString('es-PE')} ({a.tipo})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo */}
                <div>
                  <label className={labelClass}>Tipo</label>
                  <div className="flex gap-2">
                    {(['recordatorio', 'seguimiento'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => handleTipoChange(t)}
                        className={cn(
                          'flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all',
                          notifForm.tipo === t ? 'bg-primary text-white border-primary' : 'border-border-subtle text-text-muted hover:border-primary hover:text-primary',
                        )}
                      >
                        {t === 'recordatorio' ? '🔔 Recordatorio' : '📤 Seguimiento'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-text-muted mt-1">
                    {notifForm.tipo === 'recordatorio'
                      ? 'Alerta interna programada para el responsable. Sin email al cliente.'
                      : 'Programa dos correos: uno interno al responsable y uno externo al cliente.'}
                  </p>
                </div>

                {/* ═══ RECORDATORIO ═══ */}
                {notifForm.tipo === 'recordatorio' && (
                  <>
                    <div>
                      <label className={labelClass}>Plantilla <span className="text-red-500">*</span></label>
                      <select
                        value={notifForm.templateId}
                        onChange={e => handleTemplateChange(e.target.value)}
                        className={fieldClass}
                      >
                        <option value="">Seleccionar plantilla...</option>
                        {templatesForTipo.map(t => (
                          <option key={t.id} value={t.id}>{t.nombre} ({t.categoria})</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Fecha programada</label>
                        <input type="date" value={notifForm.fechaProgramada}
                          onChange={e => setNotifForm(f => ({ ...f, fechaProgramada: e.target.value }))}
                          className={fieldClass}
                        />
                        {selectedActivity?.fechaFin && (
                          <p className="text-[10px] text-text-muted mt-1">
                            Límite: {new Date(selectedActivity.fechaFin).toLocaleDateString('es-PE')}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Hora</label>
                        <input type="time" value={notifForm.horaProgramada}
                          onChange={e => setNotifForm(f => ({ ...f, horaProgramada: e.target.value }))}
                          className={fieldClass}
                        />
                      </div>
                    </div>

                    {notifForm.templateId && (
                      <div className="space-y-2">
                        <div>
                          <label className={labelClass}>Asunto del correo</label>
                          <input type="text" value={notifForm.asuntoEditado}
                            onChange={e => setNotifForm(f => ({ ...f, asuntoEditado: e.target.value }))}
                            className={fieldClass}
                            placeholder="Asunto del correo interno..."
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Cuerpo del correo</label>
                          <textarea rows={5} value={notifForm.cuerpoEditado}
                            onChange={e => setNotifForm(f => ({ ...f, cuerpoEditado: e.target.value }))}
                            className={fieldClass}
                          />
                          <p className="text-[10px] text-text-muted mt-0.5">Puedes editar el contenido sin modificar la plantilla original.</p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ═══ SEGUIMIENTO ═══ */}
                {notifForm.tipo === 'seguimiento' && (
                  <div className="space-y-5">

                    {/* Sección A: Correo al responsable */}
                    <div className="border border-blue-200 rounded-2xl p-4 space-y-3 bg-blue-50/40">
                      <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
                        📨 Correo interno — al responsable
                      </p>
                      <p className="text-[10px] text-blue-600">
                        Destinatario: <span className="font-bold">{lead.encargado ?? 'Responsable del lead'}</span>
                        {lead.encargadoEmail && <span className="text-blue-500 ml-1">({lead.encargadoEmail})</span>}
                      </p>

                      <div>
                        <label className={labelClass}>Plantilla <span className="text-red-500">*</span></label>
                        <select
                          value={notifForm.templateId}
                          onChange={e => handleTemplateChange(e.target.value)}
                          className={fieldClass}
                        >
                          <option value="">Seleccionar plantilla...</option>
                          {emailTemplates.filter(t => t.estado === 'activa').map(t => (
                            <option key={t.id} value={t.id}>{t.nombre} ({t.categoria})</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>Fecha de envío</label>
                          <input type="date" value={notifForm.fechaProgramada}
                            onChange={e => setNotifForm(f => ({ ...f, fechaProgramada: e.target.value }))}
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Hora</label>
                          <input type="time" value={notifForm.horaProgramada}
                            onChange={e => setNotifForm(f => ({ ...f, horaProgramada: e.target.value }))}
                            className={fieldClass}
                          />
                        </div>
                      </div>

                      {notifForm.templateId && (
                        <div className="space-y-2">
                          <div>
                            <label className={labelClass}>Asunto</label>
                            <input type="text" value={notifForm.asuntoEditado}
                              onChange={e => setNotifForm(f => ({ ...f, asuntoEditado: e.target.value }))}
                              className={fieldClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Cuerpo</label>
                            <textarea rows={4} value={notifForm.cuerpoEditado}
                              onChange={e => setNotifForm(f => ({ ...f, cuerpoEditado: e.target.value }))}
                              className={fieldClass}
                            />
                            <p className="text-[10px] text-blue-600 mt-0.5">Incluye enlace al lead al final del cuerpo.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sección B: Correo al cliente */}
                    <div className="border border-purple-200 rounded-2xl p-4 space-y-3 bg-purple-50/40">
                      <p className="text-[10px] font-black text-purple-700 uppercase tracking-widest">
                        📤 Correo externo — al cliente
                      </p>

                      {/* Selector de email si tiene correo2 */}
                      {contactoEmail && (
                        <div>
                          <label className={labelClass}>Email del cliente</label>
                          {contactoEmail2 ? (
                            <div className="flex gap-3">
                              {[contactoEmail, contactoEmail2].map(em => (
                                <label key={em} className={cn(
                                  'flex-1 flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-xs font-bold',
                                  notifForm.emailClienteSeleccionado === em
                                    ? 'bg-purple-100 border-purple-400 text-purple-800'
                                    : 'border-border-subtle text-text-muted hover:border-purple-300',
                                )}>
                                  <input
                                    type="radio"
                                    name="emailCliente"
                                    value={em}
                                    checked={notifForm.emailClienteSeleccionado === em}
                                    onChange={() => setNotifForm(f => ({ ...f, emailClienteSeleccionado: em }))}
                                    className="accent-purple-600"
                                  />
                                  {em}
                                </label>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-text-muted px-1">{contactoEmail}</p>
                          )}
                        </div>
                      )}
                      {!contactoEmail && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                          ⚠️ Este contacto no tiene email registrado. No se podrá enviar correo al cliente.
                        </p>
                      )}

                      <div>
                        <label className={labelClass}>Plantilla <span className="text-red-500">*</span></label>
                        <select
                          value={notifForm.templateClienteId}
                          onChange={e => handleTemplateClienteChange(e.target.value)}
                          className={fieldClass}
                        >
                          <option value="">Seleccionar plantilla...</option>
                          {emailTemplates.filter(t => t.estado === 'activa').map(t => (
                            <option key={t.id} value={t.id}>{t.nombre} ({t.categoria})</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>Fecha de envío <span className="text-[10px] text-purple-600">(posterior al interno)</span></label>
                          <input type="date" value={notifForm.fechaCliente}
                            onChange={e => setNotifForm(f => ({ ...f, fechaCliente: e.target.value }))}
                            className={fieldClass}
                            min={notifForm.fechaProgramada}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Hora</label>
                          <input type="time" value={notifForm.horaCliente}
                            onChange={e => setNotifForm(f => ({ ...f, horaCliente: e.target.value }))}
                            className={fieldClass}
                          />
                        </div>
                      </div>

                      {notifForm.templateClienteId && (
                        <div className="space-y-2">
                          <div>
                            <label className={labelClass}>Asunto</label>
                            <input type="text" value={notifForm.asuntoClienteEditado}
                              onChange={e => setNotifForm(f => ({ ...f, asuntoClienteEditado: e.target.value }))}
                              className={fieldClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Cuerpo</label>
                            <textarea rows={4} value={notifForm.cuerpoClienteEditado}
                              onChange={e => setNotifForm(f => ({ ...f, cuerpoClienteEditado: e.target.value }))}
                              className={fieldClass}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSendNotif}
                  disabled={sendingNotif || !notifForm.activityId}
                  className="btn-primary w-full disabled:opacity-40"
                >
                  {sendingNotif
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                    : notifForm.tipo === 'seguimiento'
                      ? <><Send className="w-4 h-4" /> Programar seguimiento</>
                      : <><Bell className="w-4 h-4" /> Guardar recordatorio</>
                  }
                </button>
              </div>
            )}

            {/* Todas las actividades ya tienen notificación */}
            {lead.actividades.length > 0 && availableActivities.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                <p className="text-sm font-bold text-amber-800">Sin actividades disponibles para nueva notificación</p>
                <p className="text-xs text-amber-700">
                  Si desea registrar una nueva notificación, debe eliminar la que está asociada actualmente.
                </p>
                <p className="text-[10px] text-amber-600">
                  Puede cancelar una notificación desde la lista de arriba o desde el Centro de Notificaciones.
                </p>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
