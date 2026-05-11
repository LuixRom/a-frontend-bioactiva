'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Plus, Loader2, CheckCircle2, RotateCcw, ArrowLeft, Bell, Send, XCircle, X, AlertTriangle } from 'lucide-react';
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

const localDate = (offsetDays = 0) => {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const ESTADOS = ESTADOS_LEAD.map(({ id, label }) => ({ value: id, label }));
const ACTIVITY_TIPOS = [
  { value: 'reunion', label: 'Reunión' },
  { value: 'llamada', label: 'Llamada' },
  { value: 'email',   label: 'Email' },
  { value: 'otro',    label: 'Otro' },
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
    nombre: '',
    tipo: 'reunion' as Activity['tipo'],
    nota: '',
    responsable: userName || 'Equipo Bioactiva',
    fecha: localDate(),
    fechaFin: localDate(),
  });

  // Sync ALL form fields from pending activity when the pending activity changes (by ID)
  const pendingActIdRef = useRef<string | null>(null);
  useEffect(() => {
    const pending = lead.actividades.find(a => a.estado !== 'realizada');
    if (pending && pending.id !== pendingActIdRef.current) {
      pendingActIdRef.current = pending.id;
      const toInput = (d: Date | undefined) =>
        d ? new Date(d).toLocaleDateString('en-CA') : localDate();
      setActivityForm({
        nombre: pending.nombre ?? '',
        tipo: pending.tipo,
        responsable: pending.responsable,
        fecha: toInput(pending.fecha instanceof Date ? pending.fecha : new Date(pending.fecha)),
        fechaFin: toInput(pending.fechaFin instanceof Date ? pending.fechaFin : pending.fechaFin ? new Date(pending.fechaFin) : undefined),
        nota: pending.nota,
      });
    } else if (!pending) {
      pendingActIdRef.current = null;
    }
  }, [lead.actividades]);

  const [confirmReassign, setConfirmReassign] = useState<{
    pendingActivityId: string;
    newResponsable: string;
    newEmail: string;
  } | null>(null);

  const { notifications: leadNotifs, create: createNotif, cancel: cancelNotif, hasActiveForActivity } = useLeadNotificationStore();
  const { templates: emailTemplates } = useEmailTemplateStore();
  const [confirmState, setConfirmState] = useState<{ notifId: string; activityNota: string } | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const mkDefaultNotifForm = () => ({
    activityId: '',
    tipo: 'recordatorio' as 'recordatorio' | 'seguimiento',
    // Correo al responsable (recordatorio: único; seguimiento: correo interno)
    templateId: '',
    asuntoEditado: '',
    cuerpoEditado: '',
    fechaProgramada: localDate(),
    horaProgramada: '09:00',
    // Solo seguimiento — correo externo al cliente
    templateClienteId: '',
    asuntoClienteEditado: '',
    cuerpoClienteEditado: '',
    fechaCliente: localDate(1),
    horaCliente: '09:00',
    emailClienteSeleccionado: contactoEmail ?? '',
  });
  const [notifForm, setNotifForm] = useState(mkDefaultNotifForm);
  const [sendingNotif, setSendingNotif] = useState(false);

  // Solo recordatorios programados — enviadas y canceladas no aparecen aquí
  const activeNotifsForLead = leadNotifs.filter(n => n.leadId === lead.id && n.estadoBase === 'programada');

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
    if (!currentActivity) { showToast('No hay actividad pendiente', 'error'); return; }
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
        const d = new Date(notifForm.fechaProgramada + 'T00:00:00');
        const [hh, mm] = notifForm.horaProgramada.split(':').map(Number);
        d.setHours(hh, mm, 0, 0);
        return d;
      })();

      const fechaClienteConHora = notifForm.tipo === 'seguimiento'
        ? (() => {
            const d = new Date(notifForm.fechaCliente + 'T00:00:00');
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
        activityId: currentActivity.id,
        activityNota: currentActivity.nombre || currentActivity.nota || '',
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

  // Actividad actual: más reciente no realizada; fallback: la más reciente
  const sortedActs = [...lead.actividades].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  const currentActivity = sortedActs.find(a => a.estado !== 'realizada') ?? sortedActs[0];
  const currentNotif = currentActivity
    ? leadNotifs.find(n => n.leadId === lead.id && n.activityId === currentActivity.id && n.estadoBase === 'programada')
    : undefined;

  // La notificación siempre apunta a la actividad pendiente actual
  const selectedActivity = currentActivity;
  // Bloqueado si la actividad ya tiene notif programada o enviada
  const notifBloqueada = currentActivity
    ? hasActiveForActivity(lead.id, currentActivity.id)
    : false;

  // Confirmación modal — cancelar notificación
  const confirmPhrase = confirmState ? `eliminar actividad ${confirmState.activityNota}`.trim() : '';
  const confirmMatch = confirmText.trim().toLowerCase() === confirmPhrase.toLowerCase();
  const openConfirm = (notifId: string, activityNota: string) => { setConfirmState({ notifId, activityNota }); setConfirmText(''); };
  const closeConfirm = () => { setConfirmState(null); setConfirmText(''); };
  const handleConfirmCancel = () => {
    if (!confirmMatch || !confirmState) return;
    cancelNotif(confirmState.notifId);
    showToast('Notificación cancelada', 'success');
    closeConfirm();
  };

  // Confirmación modal — eliminar actividad
  const [confirmDeleteAct, setConfirmDeleteAct] = useState<{ id: string; nombre: string } | null>(null);
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const confirmDeletePhrase = confirmDeleteAct ? `eliminar ${confirmDeleteAct.nombre}` : '';
  const confirmDeleteMatch = confirmDeleteText.trim().toLowerCase() === confirmDeletePhrase.toLowerCase();
  const openDeleteAct = (id: string, nombre: string) => { setConfirmDeleteAct({ id, nombre }); setConfirmDeleteText(''); };
  const closeDeleteAct = () => { setConfirmDeleteAct(null); setConfirmDeleteText(''); };
  const handleConfirmDeleteAct = () => {
    if (!confirmDeleteMatch || !confirmDeleteAct) return;
    handleDeleteActivity(confirmDeleteAct.id);
    closeDeleteAct();
  };

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

  const handleNoteChange = (activityId: string, nota: string) => {
    const updatedActivities = lead.actividades.map(a =>
      a.id === activityId ? { ...a, nota } : a,
    );
    onLeadUpdate({ ...lead, actividades: updatedActivities });
  };

  const doActivityUpdate = (pendingActivityId: string, reassignLead: boolean) => {
    const updatedActivities = lead.actividades.map(a =>
      a.id === pendingActivityId
        ? {
            ...a,
            nombre: activityForm.nombre,
            tipo: activityForm.tipo,
            responsable: activityForm.responsable,
            fecha: new Date(activityForm.fecha + 'T12:00:00'),
            fechaFin: activityForm.fechaFin ? new Date(activityForm.fechaFin + 'T12:00:00') : undefined,
            nota: activityForm.nota,
          }
        : a,
    );
    let updatedLead = syncLeadNextActivity({ ...lead, actividades: updatedActivities });
    if (reassignLead) {
      const u = users.find(mu => mu.name === activityForm.responsable);
      updatedLead = { ...updatedLead, encargado: activityForm.responsable, encargadoEmail: u?.email ?? '' };
    }
    onLeadUpdate(updatedLead);
    showToast(reassignLead ? `Lead reasignado a ${activityForm.responsable}` : 'Actividad actualizada', 'success');
    setConfirmReassign(null);
    if (reassignLead) onBack();
  };

  const handleMarkReminderSent = (n: typeof leadNotifs[number]) => {
    const assocActivity = lead.actividades.find(a => a.id === n.activityId);
    const historialEntry: Activity = {
      id: `act-reminder-${Date.now()}`,
      nombre: 'Recordatorio enviado',
      tipo: assocActivity?.tipo ?? 'email',
      estado: 'realizada',
      nota: n.asuntoResuelto || `Recordatorio enviado a ${n.emailResponsable}`,
      responsable: n.nombreResponsable,
      fecha: n.fechaProgramada instanceof Date ? n.fechaProgramada : new Date(n.fechaProgramada),
      fechaCompletada: new Date(),
    };
    const updatedLead = syncLeadNextActivity({
      ...lead,
      actividades: [historialEntry, ...lead.actividades],
    });
    onLeadUpdate(updatedLead);
    cancelNotif(n.id);
    showToast('Recordatorio registrado en el historial', 'success');
  };

  const handleActivityUpdate = (pendingActivityId: string) => {
    const responsableChanged = activityForm.responsable !== lead.encargado;
    if (responsableChanged && activityForm.responsable) {
      const u = users.find(mu => mu.name === activityForm.responsable);
      setConfirmReassign({ pendingActivityId, newResponsable: activityForm.responsable, newEmail: u?.email ?? '' });
      return;
    }
    doActivityUpdate(pendingActivityId, false);
  };

  const handleDeleteActivity = (activityId: string) => {
    // Cancelar notificación activa asociada si existe
    const notifActiva = leadNotifs.find(
      n => n.leadId === lead.id && n.activityId === activityId && n.estadoBase === 'programada',
    );
    if (notifActiva) cancelNotif(notifActiva.id);

    const updatedActivities = lead.actividades.filter(a => a.id !== activityId);
    const updatedLead = syncLeadNextActivity({ ...lead, actividades: updatedActivities });
    onLeadUpdate(updatedLead);

    // Resetear form si no quedan actividades pendientes
    const quedanPendientes = updatedActivities.some(a => a.estado !== 'realizada');
    if (!quedanPendientes) {
      setActivityForm({
        nombre: '',
        tipo: 'reunion',
        nota: '',
        responsable: userName || 'Equipo Bioactiva',
        fecha: localDate(),
        fechaFin: localDate(),
      });
    }
    showToast('Actividad eliminada', 'success');
  };

  const handleAddActivity = async () => {
    if (!activityForm.tipo) { showToast('El tipo es obligatorio', 'error'); return; }
    if (!activityForm.nombre.trim()) { showToast('El nombre de la actividad es obligatorio', 'error'); return; }
    if (!activityForm.fecha) { showToast('La fecha es obligatoria', 'error'); return; }

    setSavingActivity(true);
    let linkReunion: string | undefined;

    if (activityForm.tipo === 'reunion' && isConnected) {
      try {
        const start = new Date(activityForm.fecha + 'T12:00:00');
        const end = activityForm.fechaFin
          ? new Date(activityForm.fechaFin + 'T12:00:00')
          : new Date(start.getTime() + 30 * 60 * 1000);

        const attendees = contactoEmail
          ? [{ emailAddress: { address: contactoEmail, name: contactoNombre || undefined }, type: 'required' as const }]
          : [];

        type GraphEvent = { id: string; onlineMeeting?: { joinUrl?: string } };
        const event = await callGraph<GraphEvent>('/me/events', {
          method: 'POST',
          body: {
            subject: `${activityForm.nombre || activityForm.nota} — ${orgNombre || lead.id}`,
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
        id: `act-mock-${Date.now()}`,
        nombre: activityForm.nombre,
        tipo: activityForm.tipo,
        estado: 'pendiente',
        nota: activityForm.nota,
        responsable: activityForm.responsable,
        fecha: new Date(activityForm.fecha + 'T12:00:00'),
        fechaFin: activityForm.fechaFin ? new Date(activityForm.fechaFin + 'T12:00:00') : undefined,
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

    if (nextState === 'realizada') {
      setActivityForm({
        nombre: '',
        tipo: 'reunion',
        nota: '',
        responsable: userName || 'Equipo Bioactiva',
        fecha: localDate(),
        fechaFin: localDate(),
      });
    }
    showToast(nextState === 'realizada' ? 'Actividad completada' : 'Actividad reabierta', 'success');
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

            {/* Notificación Programada */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-text-muted" />
                <p className="text-xs font-bold text-text uppercase tracking-wider">Notificación Programada</p>
              </div>
              {!currentNotif ? (
                <p className="text-sm text-text-muted italic">
                  {lead.actividades.length === 0
                    ? 'Sin actividades registradas.'
                    : 'Sin notificación activa para la actividad actual.'}
                </p>
              ) : (
                <div className={cn(
                  'rounded-xl border p-4 space-y-2',
                  getEstadoNotificacion(currentNotif) === 'vencida' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200',
                )}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black uppercase', currentNotif.tipo === 'recordatorio' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>
                          {currentNotif.tipo === 'recordatorio' ? '🔔 Recordatorio' : '📤 Seguimiento'}
                        </span>
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black uppercase', getEstadoNotificacion(currentNotif) === 'vencida' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
                          {getEstadoNotificacion(currentNotif)}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted truncate">Actividad: <span className="font-semibold text-text">{currentNotif.activityNota}</span></p>
                      <p className="text-sm font-bold text-text truncate">{currentNotif.asuntoResuelto}</p>
                      <p className="text-xs text-text-muted">
                        {new Date(currentNotif.fechaProgramada).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <button
                      onClick={() => openConfirm(currentNotif.id, currentNotif.activityNota)}
                      className="shrink-0 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors"
                      title="Cancelar notificación"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
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

              <div>
                <label className={labelClass}>Nombre de la actividad <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={activityForm.nombre}
                  onChange={e => setActivityForm(f => ({ ...f, nombre: e.target.value }))}
                  className={fieldClass}
                  placeholder="Ej: Llamada de seguimiento, Presentación de propuesta..."
                />
              </div>

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
                  <label className={labelClass}>Fecha de inicio</label>
                  <input type="date" value={activityForm.fecha} onChange={e => setActivityForm(f => ({ ...f, fecha: e.target.value }))} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Fecha de fin</label>
                  <input type="date" value={activityForm.fechaFin} onChange={e => setActivityForm(f => ({ ...f, fechaFin: e.target.value }))} className={fieldClass} />
                </div>
              </div>

              <button
                onClick={async () => {
                  if (tabEventAdded || addingTabEvent) return;
                  setAddingTabEvent(true);
                  try {
                    const start = new Date(activityForm.fecha + 'T12:00:00');
                    const end = activityForm.fechaFin ? new Date(activityForm.fechaFin + 'T12:00:00') : new Date(start.getTime() + 60 * 60 * 1000);
                    const attendees = contactoEmail ? [{ emailAddress: { address: contactoEmail, name: contactoNombre || undefined }, type: 'required' as const }] : [];
                    await callGraph('/me/events', {
                      method: 'POST',
                      body: {
                        subject: activityForm.nombre || activityForm.nota || `Actividad ${activityForm.tipo}`,
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

              {(() => {
                const pendingActivity = lead.actividades.find(a => a.estado !== 'realizada');
                return (
                  <>
                    <div>
                      <label className={labelClass}>{pendingActivity ? 'Notas de la actividad' : 'Notas iniciales'}</label>
                      <textarea
                        rows={3}
                        value={activityForm.nota}
                        onChange={e => setActivityForm(f => ({ ...f, nota: e.target.value }))}
                        className={fieldClass}
                        placeholder="¿Qué se conversó o planeas hacer con el cliente?"
                      />
                    </div>

                    {activityForm.tipo === 'reunion' && !isConnected && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                        <p className="text-xs text-blue-800 font-medium">Conecta tu cuenta Microsoft para generar reuniones de Teams.</p>
                        <Link href="/profile" className="text-xs font-bold text-blue-600 hover:underline">Ir a configuración →</Link>
                      </div>
                    )}

                    {pendingActivity ? (
                      <div className="space-y-2">
                        <button
                          onClick={() => handleActivityUpdate(pendingActivity.id)}
                          className="btn-primary w-full"
                        >
                          <Save className="w-4 h-4 inline mr-2" /> Guardar cambios
                        </button>
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-center">
                          Completa o elimina la actividad pendiente antes de registrar una nueva.
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={handleAddActivity}
                        disabled={savingActivity || !activityForm.nombre.trim()}
                        className={cn('w-full disabled:opacity-40', activityForm.tipo === 'reunion' && isConnected ? 'bg-[#5059C9] hover:bg-[#4048A8] text-white py-3 rounded-xl font-semibold shadow-sm transition-all' : 'btn-primary')}
                      >
                        {savingActivity
                          ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Guardando...</>
                          : activityForm.tipo === 'reunion' && isConnected
                            ? <span className="flex items-center justify-center gap-2">Crear reunión de Teams</span>
                            : <><Plus className="w-4 h-4 inline mr-2" /> Registrar actividad</>
                        }
                      </button>
                    )}
                  </>
                );
              })()}
            </div>

            <div>
              <p className="text-xs font-bold text-text uppercase tracking-wider mb-3">Historial</p>
              <Timeline
                items={lead.actividades.map(a => ({
                  id: a.id,
                  nombre: a.nombre,
                  fecha: a.fecha instanceof Date ? a.fecha : new Date(a.fecha),
                  tipo: a.tipo,
                  estado: a.estado,
                  nota: a.nota,
                  responsable: a.responsable,
                }))}
                onComplete={(id) => handleActivityStateChange(id, 'realizada')}
                onDelete={(id) => {
                  const act = lead.actividades.find(a => a.id === id);
                  openDeleteAct(id, act?.nombre || act?.nota || id);
                }}
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
                  if (n.tipo === 'recordatorio') {
                    return (
                      <div key={n.id} className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1 min-w-0">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-700">
                              🔔 Recordatorio
                            </span>
                            <p className="text-sm font-bold text-text pt-1">{n.activityNota}</p>
                            <p className="text-xs text-text-muted">
                              📧 Se enviará a <span className="font-semibold text-text">{n.emailResponsable}</span>
                            </p>
                            <p className="text-xs text-text-muted">
                              📅 Fecha: <span className="font-semibold text-text">
                                {new Date(n.fechaProgramada).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </p>
                          </div>
                          <button
                            onClick={() => openConfirm(n.id, n.activityNota)}
                            className="shrink-0 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors"
                            title="Cancelar recordatorio"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Seguimiento — card completo (sin cambios por ahora)
                  const estado = getEstadoNotificacion(n);
                  const cardClass = estado === 'vencida' ? 'bg-red-50 border-red-200' : estado === 'enviada' ? 'bg-purple-50 border-purple-200' : 'bg-green-50 border-green-200';
                  const estadoBadgeClass = estado === 'vencida' ? 'bg-red-100 text-red-700' : estado === 'enviada' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700';
                  return (
                    <div key={n.id} className={cn('rounded-2xl border p-4 space-y-2', cardClass)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-700">📤 Seguimiento</span>
                            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black uppercase', estadoBadgeClass)}>{estado}</span>
                          </div>
                          <p className="text-xs text-text-muted">Actividad: <span className="font-semibold text-text">{n.activityNota}</span></p>
                          <p className="text-sm font-bold text-text truncate">{n.asuntoResuelto}</p>
                          <p className="text-xs text-text-muted">Plantilla: {n.templateNombre} · {new Date(n.fechaProgramada).toLocaleDateString('es-PE')}</p>
                          <p className="text-[10px] text-text-muted">
                            Responsable: <span className="font-semibold text-text">{n.nombreResponsable}</span>
                          </p>
                          {n.emailCliente && <p className="text-[10px] text-text-muted">Cliente: {n.emailCliente}</p>}
                        </div>
                        {estado !== 'enviada' && (
                          <button onClick={() => openConfirm(n.id, n.activityNota)} className="shrink-0 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors" title="Cancelar">
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
            {!currentActivity && (
              <div className="text-center py-8 bg-app-bg/30 rounded-2xl border border-dashed border-border-subtle">
                <Bell className="w-8 h-8 text-text-muted/30 mx-auto mb-2" />
                <p className="text-sm font-bold text-text-muted">Sin actividades pendientes</p>
                <p className="text-xs text-text-muted mt-1">Registra una actividad primero para crear una notificación.</p>
              </div>
            )}

            {/* Bloqueado: actividad ya tiene notif programada o enviada */}
            {currentActivity && notifBloqueada && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-sm font-bold text-amber-800">Notificación ya registrada</p>
                <p className="text-xs text-amber-700 mt-1">
                  La actividad <span className="font-semibold">{currentActivity.nombre || currentActivity.nota}</span> ya tiene una notificación programada o enviada. Completa o cancela la actual antes de crear una nueva.
                </p>
              </div>
            )}

            {/* Formulario nueva notificación */}
            {currentActivity && !notifBloqueada && (
              <div className="bg-app-bg/40 rounded-2xl p-5 border border-border-subtle space-y-4">
                <p className="text-xs font-bold text-text uppercase tracking-wider">Nueva notificación</p>

                {/* Actividad actual — solo lectura */}
                <div className="bg-surface rounded-xl border border-border-subtle px-4 py-3 space-y-0.5">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Actividad</p>
                  <p className="text-sm font-bold text-text">{currentActivity.nombre || currentActivity.nota}</p>
                  <p className="text-xs text-text-muted">
                    {currentActivity.tipo} · {new Date(currentActivity.fecha).toLocaleDateString('es-PE')}
                    {currentActivity.fechaFin ? ` → ${new Date(currentActivity.fechaFin).toLocaleDateString('es-PE')}` : ''}
                  </p>
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
                  disabled={sendingNotif || !currentActivity}
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


          </div>
        )}
      </div>

      {/* Modal de confirmación de reasignación de responsable */}
      {confirmReassign && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmReassign(null)} />
          <div className="relative bg-surface rounded-2xl border border-border-subtle shadow-2xl p-6 w-full max-w-md space-y-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-text">Cambio de responsable</h3>
                <p className="text-sm text-text-muted mt-1">
                  Estás asignando esta actividad a <span className="font-bold text-text">{confirmReassign.newResponsable}</span>.
                  ¿También quieres reasignar el lead completo a este trabajador? Aparecerá en su panel.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => doActivityUpdate(confirmReassign.pendingActivityId, true)}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-all"
              >
                Sí, reasignar lead a {confirmReassign.newResponsable}
              </button>
              <button
                onClick={() => doActivityUpdate(confirmReassign.pendingActivityId, false)}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-bold bg-surface border border-border-subtle text-text hover:bg-app-bg transition-all"
              >
                No, solo actualizar la actividad
              </button>
              <button
                onClick={() => setConfirmReassign(null)}
                className="w-full py-2 text-xs text-text-muted hover:text-text transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar actividad */}
      {confirmDeleteAct && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDeleteAct} />
          <div className="relative bg-surface rounded-2xl border border-border-subtle shadow-2xl p-6 w-full max-w-md space-y-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-text">Eliminar actividad</h3>
                <p className="text-xs text-text-muted mt-1">Se eliminará la actividad y sus notificaciones asociadas. Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <div className="bg-app-bg/60 rounded-xl p-3 border border-border-subtle">
              <p className="text-xs text-text-muted">Para confirmar, escribe exactamente:</p>
              <p className="text-sm font-bold text-text mt-1 font-mono break-all">
                eliminar {confirmDeleteAct.nombre}
              </p>
            </div>

            <input
              type="text"
              value={confirmDeleteText}
              onChange={e => setConfirmDeleteText(e.target.value)}
              placeholder="Escribe la frase de confirmación..."
              className="w-full px-3 py-2.5 bg-app-bg/40 border border-border-subtle rounded-xl text-sm outline-none focus:border-red-400 transition-all"
              autoFocus
            />

            <div className="flex gap-3">
              <button onClick={closeDeleteAct} className="btn-secondary flex-1">Cancelar</button>
              <button
                onClick={handleConfirmDeleteAct}
                disabled={!confirmDeleteMatch}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Confirmar eliminación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para cancelar notificación */}
      {confirmState && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeConfirm} />
          <div className="relative bg-surface rounded-2xl border border-border-subtle shadow-2xl p-6 w-full max-w-md space-y-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-text">Cancelar notificación</h3>
                <p className="text-xs text-text-muted mt-1">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <div className="bg-app-bg/60 rounded-xl p-3 border border-border-subtle">
              <p className="text-xs text-text-muted">Para confirmar, escribe exactamente:</p>
              <p className="text-sm font-bold text-text mt-1 font-mono break-all">
                eliminar actividad {confirmState.activityNota}
              </p>
            </div>

            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="Escribe la frase de confirmación..."
              className="w-full px-3 py-2.5 bg-app-bg/40 border border-border-subtle rounded-xl text-sm outline-none focus:border-red-400 transition-all"
              autoFocus
            />

            <div className="flex gap-3">
              <button onClick={closeConfirm} className="btn-secondary flex-1">Cancelar</button>
              <button
                onClick={handleConfirmCancel}
                disabled={!confirmMatch}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Confirmar eliminación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
