'use client';

import { useEffect, useRef } from 'react';
import { useLeadNotificationStore } from '@/src/store/leadNotificationStore';
import { useLeadStore } from '@/src/store/leadStore';
import { useNotificationStore } from '@/src/store/notificationStore';
import { sendEmail } from '@/src/server/actions/sendEmail';
import type { Activity } from '@/src/types/crm';

const POLL_INTERVAL = 30_000;

export default function ReminderScheduler() {
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const check = async () => {
      const { notifications, markAsSent } = useLeadNotificationStore.getState();
      const { leads, updateLead } = useLeadStore.getState();
      const { addNotification } = useNotificationStore.getState();

      const now = new Date();

      const due = notifications.filter(
        (n) =>
          n.tipo === 'recordatorio' &&
          n.estadoBase === 'programada' &&
          new Date(n.fechaProgramada) <= now &&
          !firedRef.current.has(n.id),
      );

      for (const n of due) {
        firedRef.current.add(n.id);

        // 1. Send email
        sendEmail({
          to: n.emailResponsable,
          subject: n.asuntoResuelto,
          body: n.cuerpoResuelto,
        }).catch(() => {});

        // 2. Add activity to lead historial
        const lead = leads.find((l) => l.id === n.leadId);
        if (lead) {
          const assocActivity = lead.actividades.find((a) => a.id === n.activityId);
          const newActivity: Activity = {
            id: `act-rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            nombre: 'Recordatorio enviado',
            tipo: assocActivity?.tipo ?? 'otro',
            estado: 'pendiente',
            nota: n.asuntoResuelto,
            responsable: n.nombreResponsable,
            fecha: new Date(n.fechaProgramada),
          };
          updateLead({
            ...lead,
            actividades: [...lead.actividades, newActivity],
          });
        }

        // 3. Add to global notification store
        addNotification({
          tipo: 'general',
          titulo: 'Recordatorio enviado',
          mensaje: `Recordatorio para ${n.orgNombre}: ${n.asuntoResuelto}`,
          destinatario: {
            tipo: 'usuario',
            userId: n.emailResponsable,
          },
          linkUrl: `/pipeline?leadId=${n.leadId}`,
        });

        // 4. Mark leadNotification as sent
        markAsSent(n.id);
      }
    };

    check();
    const id = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return null;
}
