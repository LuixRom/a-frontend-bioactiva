import { create } from 'zustand';
import type { EmailTemplate, CategoriaPlantilla, EstadoPlantilla } from '@/src/types/emailTemplate';

const initialTemplates: EmailTemplate[] = [
  {
    id: 'TPL-001',
    nombre: 'Confirmación de reunión',
    asunto: 'Confirmación: Reunión con {{nombre_organizacion}} — {{fecha_actividad}}',
    cuerpo: `Estimado/a {{nombre_contacto}},

Le confirmamos la reunión programada para el {{fecha_actividad}}.

En esta sesión abordaremos los avances relacionados a {{servicio_interes}}.

Le pedimos presentarse con 5 minutos de anticipación. Cualquier consulta, comuníquese con {{nombre_encargado}}.

Saludos cordiales,
Equipo BioActiva`,
    categoria: 'reunion',
    estado: 'activa',
    creadoPor: 'Karien Diaz',
    creadoEn: new Date('2025-01-15'),
    actualizadoEn: new Date('2025-01-15'),
    enUso: true,
  },
  {
    id: 'TPL-002',
    nombre: 'Seguimiento post-llamada',
    asunto: 'Seguimiento a nuestra llamada — {{nombre_organizacion}}',
    cuerpo: `Estimado/a {{nombre_contacto}},

Gracias por tomarse el tiempo para conversar con nosotros el día de hoy.

Como acordamos, los próximos pasos para el servicio de {{servicio_interes}} son:

1. Revisión de la propuesta técnica que le enviaremos en los próximos días.
2. Programación de reunión presencial de kick-off.

Estaremos en contacto. Ante cualquier duda, puede escribirnos directamente.

Atentamente,
{{nombre_encargado}}
BioActiva`,
    categoria: 'llamada',
    estado: 'activa',
    creadoPor: 'Karien Diaz',
    creadoEn: new Date('2025-01-20'),
    actualizadoEn: new Date('2025-02-10'),
    enUso: true,
  },
  {
    id: 'TPL-003',
    nombre: 'Propuesta enviada',
    asunto: 'Propuesta técnica — {{servicio_interes}} para {{nombre_organizacion}}',
    cuerpo: `Estimado/a {{nombre_contacto}},

Adjuntamos la propuesta técnica y económica elaborada para {{nombre_organizacion}}, correspondiente al servicio de {{servicio_interes}}.

En el documento encontrará:
- Descripción del alcance del servicio
- Cronograma de trabajo
- Propuesta económica detallada

Quedamos a disposición para resolver cualquier consulta o coordinar una reunión de presentación.

Cordialmente,
{{nombre_encargado}}
BioActiva`,
    categoria: 'email',
    estado: 'activa',
    creadoPor: 'Administración',
    creadoEn: new Date('2025-02-01'),
    actualizadoEn: new Date('2025-02-01'),
    enUso: false,
  },
  {
    id: 'TPL-004',
    nombre: 'Recordatorio de actividad próxima',
    asunto: 'Recordatorio: {{servicio_interes}} — actividad el {{fecha_actividad}}',
    cuerpo: `Estimado/a {{nombre_contacto}},

Le recordamos que el {{fecha_actividad}} tenemos programada una actividad en el marco del proyecto {{servicio_interes}}.

Por favor confirmar su disponibilidad respondiendo este correo.

Gracias,
{{nombre_encargado}}
BioActiva`,
    categoria: 'reunion',
    estado: 'activa',
    creadoPor: 'Karien Diaz',
    creadoEn: new Date('2025-02-15'),
    actualizadoEn: new Date('2025-02-15'),
    enUso: false,
  },
  {
    id: 'TPL-005',
    nombre: 'Cierre exitoso — agradecimiento',
    asunto: '¡Felicitaciones! Proyecto aprobado — {{nombre_organizacion}}',
    cuerpo: `Estimado/a {{nombre_contacto}},

Nos complace comunicarle que el proyecto {{servicio_interes}} ha sido aprobado satisfactoriamente.

Este resultado es fruto del trabajo conjunto y del compromiso de {{nombre_organizacion}} con la innovación.

Ha sido un placer acompañarlos en este proceso. Quedamos a disposición para futuros proyectos.

Con mucho gusto,
{{nombre_encargado}}
Equipo BioActiva`,
    categoria: 'email',
    estado: 'activa',
    creadoPor: 'Karien Diaz',
    creadoEn: new Date('2025-03-01'),
    actualizadoEn: new Date('2025-03-01'),
    enUso: false,
  },
  {
    id: 'TPL-006',
    nombre: 'Reactivación de lead inactivo',
    asunto: 'Retomamos contacto — {{nombre_organizacion}}',
    cuerpo: `Estimado/a {{nombre_contacto}},

Espero que se encuentre bien. Me pongo en contacto para retomar la conversación sobre {{servicio_interes}} que tuvimos hace un tiempo.

Hemos incorporado nuevas modalidades de servicio que podrían ser de gran utilidad para {{nombre_organizacion}}.

¿Tendría disponibilidad para una llamada breve esta semana?

Saludos,
{{nombre_encargado}}
BioActiva`,
    categoria: 'otro',
    estado: 'inactiva',
    creadoPor: 'Administración',
    creadoEn: new Date('2025-03-10'),
    actualizadoEn: new Date('2025-04-01'),
    enUso: false,
  },
];

interface EmailTemplateStore {
  templates: EmailTemplate[];
  create: (data: {
    nombre: string;
    asunto: string;
    cuerpo: string;
    categoria: CategoriaPlantilla;
    estado: EstadoPlantilla;
    creadoPor: string;
  }) => EmailTemplate;
  update: (id: string, changes: {
    nombre?: string;
    asunto?: string;
    cuerpo?: string;
    categoria?: CategoriaPlantilla;
    estado?: EstadoPlantilla;
  }) => void;
  remove: (id: string) => void;
  deactivate: (id: string) => void;
}

export const useEmailTemplateStore = create<EmailTemplateStore>((set, get) => ({
  templates: initialTemplates,

  create: (data) => {
    const count = get().templates.length + 1;
    const newTemplate: EmailTemplate = {
      ...data,
      id: `TPL-${String(count).padStart(3, '0')}`,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
      enUso: false,
    };
    set((s) => ({ templates: [newTemplate, ...s.templates] }));
    return newTemplate;
  },

  update: (id, changes) => {
    set((s) => ({
      templates: s.templates.map((t) =>
        t.id === id ? { ...t, ...changes, actualizadoEn: new Date() } : t,
      ),
    }));
  },

  remove: (id) => {
    set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }));
  },

  deactivate: (id) => {
    set((s) => ({
      templates: s.templates.map((t) =>
        t.id === id ? { ...t, estado: 'inactiva', actualizadoEn: new Date() } : t,
      ),
    }));
  },
}));
