'use client';

import { useState, useRef } from 'react';
import {
  Plus, ArrowLeft, Eye, Pencil, Trash2, Users, Phone, Mail, Tag,
  AlertTriangle, CheckCircle, XCircle,
} from 'lucide-react';
import { cn, formatDate } from '@/src/lib/utils';
import { useEmailTemplateStore } from '@/src/store/emailTemplateStore';
import { useAuthStore } from '@/src/store/authStore';
import { useToast } from '@/src/components/ui/Toast';
import DataTable from '@/src/components/ui/DataTable';
import type { EmailTemplate, CategoriaPlantilla, EstadoPlantilla } from '@/src/types/emailTemplate';

// ── Constantes ────────────────────────────────────────────────────────────────

const CATEGORIAS: Record<CategoriaPlantilla, { label: string; color: string; Icon: React.ElementType }> = {
  reunion: { label: 'Reunión',  color: 'bg-blue-100 text-blue-700',   Icon: Users },
  llamada: { label: 'Llamada',  color: 'bg-amber-100 text-amber-700', Icon: Phone },
  email:   { label: 'Email',    color: 'bg-green-100 text-green-700', Icon: Mail  },
  otro:    { label: 'Otro',     color: 'bg-gray-100 text-gray-600',   Icon: Tag   },
};

const VARIABLES = [
  { key: '{{nombre_contacto}}',     label: 'Nombre contacto'    },
  { key: '{{nombre_organizacion}}', label: 'Organización'       },
  { key: '{{servicio_interes}}',    label: 'Servicio de interés' },
  { key: '{{nombre_encargado}}',    label: 'Encargado'          },
  { key: '{{fecha_actividad}}',     label: 'Fecha actividad'    },
  { key: '{{estado_lead}}',         label: 'Estado del lead'    },
];

const SAMPLE_VALUES: Record<string, string> = {
  '{{nombre_contacto}}':     'Ricardo Perales',
  '{{nombre_organizacion}}': 'Altomayo',
  '{{servicio_interes}}':    'Formulación de proyecto CONCYTEC',
  '{{nombre_encargado}}':    'Karien Diaz',
  '{{fecha_actividad}}':     '15 de mayo de 2025',
  '{{estado_lead}}':         'En proceso',
};

const emptyForm = {
  nombre:    '',
  asunto:    '',
  cuerpo:    '',
  categoria: 'email' as CategoriaPlantilla,
  estado:    'activa' as EstadoPlantilla,
};

type View = 'list' | 'new' | 'detail' | 'edit';

// ── Helpers ───────────────────────────────────────────────────────────────────

function BodyWithVariables({ body }: { body: string }) {
  const parts = body.split(/({{[^}]+}})/g);
  return (
    <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">
      {parts.map((part, i) =>
        /^{{.+}}$/.test(part) ? (
          <span key={i} className="bg-primary/10 text-primary font-mono text-[11px] px-1.5 py-0.5 rounded border border-primary/20">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </p>
  );
}

function BodyPreview({ body }: { body: string }) {
  const rendered = body.replace(/{{[^}]+}}/g, (match) => SAMPLE_VALUES[match] ?? match);
  return (
    <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">{rendered}</p>
  );
}

function CategoriaBadge({ categoria }: { categoria: CategoriaPlantilla }) {
  const { label, color, Icon } = CATEGORIAS[categoria];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', color)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function TemplatesClient() {
  const { templates, create, update, remove, deactivate } = useEmailTemplateStore();
  const userName = useAuthStore((s) => s.userName);
  const { showToast } = useToast();

  const [view, setView]               = useState<View>('list');
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [form, setForm]               = useState(emptyForm);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);
  const [preview, setPreview]         = useState(false);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const selectedTemplate = templates.find((t) => t.id === selectedId) ?? null;

  // ── Validación ──────────────────────────────────────────────────────────────

  const validate = (f: typeof form, editingId?: string): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!f.nombre.trim())  e.nombre  = 'El nombre es obligatorio.';
    if (!f.asunto.trim())  e.asunto  = 'El asunto es obligatorio.';
    if (!f.cuerpo.trim())  e.cuerpo  = 'El cuerpo es obligatorio.';

    const duplicate = templates.find(
      (t) => t.nombre.trim().toLowerCase() === f.nombre.trim().toLowerCase() && t.id !== editingId,
    );
    if (duplicate) e.nombre = 'Ya existe una plantilla con este nombre.';

    return e;
  };

  // ── Acciones CRUD ───────────────────────────────────────────────────────────

  const handleCreate = () => {
    const e = validate(form);
    if (Object.keys(e).length) { setErrors(e); return; }

    create({ ...form, creadoPor: userName ?? 'Usuario' });
    showToast('Plantilla creada correctamente', 'success');
    setView('list');
    setForm(emptyForm);
    setErrors({});
  };

  const handleUpdate = () => {
    if (!selectedId) return;
    const e = validate(form, selectedId);
    if (Object.keys(e).length) { setErrors(e); return; }

    update(selectedId, form);
    showToast('Plantilla actualizada', 'success');
    setView('detail');
    setErrors({});
  };

  const handleDeleteRequest = (tpl: EmailTemplate) => setDeleteTarget(tpl);

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    remove(deleteTarget.id);
    showToast('Plantilla eliminada', 'success');
    setDeleteTarget(null);
    if (selectedId === deleteTarget.id) { setSelectedId(null); setView('list'); }
  };

  const handleDeactivateConfirm = () => {
    if (!deleteTarget) return;
    deactivate(deleteTarget.id);
    showToast('Plantilla desactivada', 'success');
    setDeleteTarget(null);
  };

  // ── Navegación ──────────────────────────────────────────────────────────────

  const goDetail = (tpl: EmailTemplate) => {
    setSelectedId(tpl.id);
    setView('detail');
    setPreview(false);
  };

  const goEdit = (tpl: EmailTemplate) => {
    setSelectedId(tpl.id);
    setForm({ nombre: tpl.nombre, asunto: tpl.asunto, cuerpo: tpl.cuerpo, categoria: tpl.categoria, estado: tpl.estado });
    setErrors({});
    setView('edit');
  };

  const goNew = () => {
    setSelectedId(null);
    setForm(emptyForm);
    setErrors({});
    setView('new');
  };

  const goList = () => { setView('list'); setSelectedId(null); setErrors({}); };

  // ── Insertar variable en textarea ──────────────────────────────────────────

  const insertVariable = (varKey: string) => {
    const el = bodyRef.current;
    if (!el) {
      setForm((f) => ({ ...f, cuerpo: f.cuerpo + varKey }));
      return;
    }
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const next  = form.cuerpo.slice(0, start) + varKey + form.cuerpo.slice(end);
    setForm((f) => ({ ...f, cuerpo: next }));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + varKey.length, start + varKey.length);
    }, 0);
  };

  // ── Columnas DataTable ─────────────────────────────────────────────────────

  const columns = [
    {
      key: 'nombre',
      header: 'Plantilla',
      sortable: true,
      render: (t: EmailTemplate) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {(() => { const { Icon } = CATEGORIAS[t.categoria]; return <Icon className="w-4 h-4 text-primary" />; })()}
          </div>
          <div>
            <p className="font-bold text-primary">{t.nombre}</p>
            <p className="text-[10px] text-text-muted truncate max-w-[260px]">{t.asunto}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'categoria',
      header: 'Categoría',
      render: (t: EmailTemplate) => <CategoriaBadge categoria={t.categoria} />,
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (t: EmailTemplate) => (
        <span className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
          t.estado === 'activa' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
        )}>
          {t.estado === 'activa'
            ? <CheckCircle className="w-3 h-3" />
            : <XCircle className="w-3 h-3" />}
          {t.estado}
        </span>
      ),
    },
    {
      key: 'creadoEn',
      header: 'Creada',
      render: (t: EmailTemplate) => (
        <span className="text-xs text-text-muted">{formatDate(t.creadoEn)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (t: EmailTemplate) => (
        <div className="flex gap-1">
          <button
            onClick={() => goDetail(t)}
            title="Ver detalle"
            className="p-1.5 rounded-lg hover:bg-app-bg text-text-muted hover:text-primary transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => goEdit(t)}
            title="Editar"
            className="p-1.5 rounded-lg hover:bg-app-bg text-text-muted hover:text-primary transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteRequest(t)}
            title="Eliminar"
            className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // ── Formulario compartido (new / edit) ─────────────────────────────────────

  const FormView = ({ mode }: { mode: 'new' | 'edit' }) => (
    <div className="max-w-2xl w-full mx-auto animate-fade-in">
      <div className="rounded-2xl border border-border-subtle bg-surface p-8 space-y-6">

        {/* Nombre */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Nombre de la plantilla <span className="text-red-500">*</span>
          </label>
          <input
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            className={cn(
              'w-full px-4 py-3 bg-app-bg/30 border rounded-xl text-sm outline-none focus:border-primary transition-all',
              errors.nombre ? 'border-red-400' : 'border-border-subtle',
            )}
            placeholder="Ej: Confirmación de reunión"
          />
          {errors.nombre && <p className="text-xs text-red-500">{errors.nombre}</p>}
        </div>

        {/* Asunto */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Asunto del correo <span className="text-red-500">*</span>
          </label>
          <input
            value={form.asunto}
            onChange={(e) => setForm((f) => ({ ...f, asunto: e.target.value }))}
            className={cn(
              'w-full px-4 py-3 bg-app-bg/30 border rounded-xl text-sm outline-none focus:border-primary transition-all',
              errors.asunto ? 'border-red-400' : 'border-border-subtle',
            )}
            placeholder="Ej: Reunión con {{nombre_organizacion}} — {{fecha_actividad}}"
          />
          {errors.asunto && <p className="text-xs text-red-500">{errors.asunto}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Categoría */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Categoría</label>
            <select
              value={form.categoria}
              onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value as CategoriaPlantilla }))}
              className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
            >
              {(Object.keys(CATEGORIAS) as CategoriaPlantilla[]).map((k) => (
                <option key={k} value={k}>{CATEGORIAS[k].label}</option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Estado</label>
            <select
              value={form.estado}
              onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as EstadoPlantilla }))}
              className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
            >
              <option value="activa">Activa</option>
              <option value="inactiva">Inactiva</option>
            </select>
          </div>
        </div>

        {/* Variables disponibles */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Variables disponibles
            <span className="normal-case font-normal ml-2 text-text-muted">Haz clic para insertar en el cuerpo</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {VARIABLES.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertVariable(v.key)}
                className="px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-lg text-[11px] font-mono text-primary hover:bg-primary/20 transition-colors"
              >
                {v.key}
              </button>
            ))}
          </div>
        </div>

        {/* Cuerpo */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Cuerpo del mensaje <span className="text-red-500">*</span>
          </label>
          <textarea
            ref={bodyRef}
            value={form.cuerpo}
            onChange={(e) => setForm((f) => ({ ...f, cuerpo: e.target.value }))}
            rows={10}
            className={cn(
              'w-full px-4 py-3 bg-app-bg/30 border rounded-xl text-sm outline-none focus:border-primary transition-all resize-y font-mono leading-relaxed',
              errors.cuerpo ? 'border-red-400' : 'border-border-subtle',
            )}
            placeholder="Escribe el cuerpo del correo aquí. Usa las variables de arriba para personalizar."
          />
          {errors.cuerpo && <p className="text-xs text-red-500">{errors.cuerpo}</p>}
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => mode === 'new' ? goList() : setView('detail')}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Cancelar
          </button>
          <button
            onClick={mode === 'new' ? handleCreate : handleUpdate}
            className="btn-primary flex-1"
          >
            {mode === 'new' ? 'Guardar plantilla' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Tabs — ocultos en detail/edit/new (tienen su propio back) */}
      {view === 'list' && (
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-app-bg p-1 rounded-xl border border-border-subtle w-fit">
            <span className="px-5 py-2 rounded-lg text-sm font-bold bg-surface text-primary shadow-sm">
              Plantillas
            </span>
            <button
              onClick={goNew}
              className="px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 text-text-muted hover:text-text"
            >
              <Plus className="w-3.5 h-3.5" /> Nueva Plantilla
            </button>
          </div>
          <p className="text-xs text-text-muted">
            {templates.filter((t) => t.estado === 'activa').length} activas · {templates.length} total
          </p>
        </div>
      )}

      {/* LIST */}
      {view === 'list' && (
        <>
          <h1 className="text-2xl font-black text-text">Plantillas de Correo</h1>
          <DataTable
            data={templates}
            columns={columns}
            pageSize={8}
            searchPlaceholder="Buscar por nombre, asunto, categoría..."
            extraSearchFields={(t) => [t.nombre, t.asunto, t.cuerpo, t.categoria, t.estado, t.creadoPor]}
          />
        </>
      )}

      {/* NEW */}
      {view === 'new' && (
        <div className="space-y-4 animate-fade-in">
          <button onClick={goList} className="btn-secondary flex items-center gap-2 w-fit">
            <ArrowLeft className="w-4 h-4" /> Volver a Plantillas
          </button>
          <h1 className="text-2xl font-black text-text">Nueva Plantilla</h1>
          <FormView mode="new" />
        </div>
      )}

      {/* EDIT */}
      {view === 'edit' && selectedTemplate && (
        <div className="space-y-4 animate-fade-in">
          <button onClick={() => setView('detail')} className="btn-secondary flex items-center gap-2 w-fit">
            <ArrowLeft className="w-4 h-4" /> Volver al detalle
          </button>
          <h1 className="text-2xl font-black text-text">Editar Plantilla</h1>
          <FormView mode="edit" />
        </div>
      )}

      {/* DETAIL */}
      {view === 'detail' && selectedTemplate && (
        <div className="animate-fade-in space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button onClick={goList} className="btn-secondary flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Volver a Plantillas
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => goEdit(selectedTemplate)}
                className="btn-secondary flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" /> Editar
              </button>
              <button
                onClick={() => handleDeleteRequest(selectedTemplate)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-sm font-semibold transition-all"
              >
                <Trash2 className="w-4 h-4" /> Eliminar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Meta */}
            <div className="col-span-1 space-y-4">
              <div className="bg-surface rounded-2xl border border-border-subtle p-5 space-y-4">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Información</p>
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase">Nombre</p>
                  <p className="text-sm font-semibold text-text mt-0.5">{selectedTemplate.nombre}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase">Categoría</p>
                  <div className="mt-1"><CategoriaBadge categoria={selectedTemplate.categoria} /></div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase">Estado</p>
                  <span className={cn(
                    'inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                    selectedTemplate.estado === 'activa' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
                  )}>
                    {selectedTemplate.estado === 'activa'
                      ? <CheckCircle className="w-3 h-3" />
                      : <XCircle className="w-3 h-3" />}
                    {selectedTemplate.estado}
                  </span>
                </div>
                {selectedTemplate.enUso && (
                  <div className="flex items-center gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <p className="text-[10px] font-semibold text-amber-700">En uso por notificaciones</p>
                  </div>
                )}
                <div className="pt-2 border-t border-border-subtle space-y-2">
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase">Creada por</p>
                    <p className="text-xs font-semibold text-text mt-0.5">{selectedTemplate.creadoPor}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase">Fecha de creación</p>
                    <p className="text-xs text-text mt-0.5">{formatDate(selectedTemplate.creadoEn)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase">Última actualización</p>
                    <p className="text-xs text-text mt-0.5">{formatDate(selectedTemplate.actualizadoEn)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contenido */}
            <div className="col-span-2 space-y-4">
              {/* Asunto */}
              <div className="bg-surface rounded-2xl border border-border-subtle p-5 space-y-2">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Asunto</p>
                <BodyWithVariables body={selectedTemplate.asunto} />
              </div>

              {/* Tabs cuerpo / preview */}
              <div className="bg-surface rounded-2xl border border-border-subtle overflow-hidden">
                <div className="flex border-b border-border-subtle">
                  <button
                    onClick={() => setPreview(false)}
                    className={cn(
                      'px-5 py-3 text-xs font-bold transition-all',
                      !preview ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-text-muted hover:text-text',
                    )}
                  >
                    Cuerpo con variables
                  </button>
                  <button
                    onClick={() => setPreview(true)}
                    className={cn(
                      'px-5 py-3 text-xs font-bold transition-all',
                      preview ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-text-muted hover:text-text',
                    )}
                  >
                    Vista previa (datos de muestra)
                  </button>
                </div>
                <div className="p-5">
                  {preview
                    ? <BodyPreview body={selectedTemplate.cuerpo} />
                    : <BodyWithVariables body={selectedTemplate.cuerpo} />}
                </div>
              </div>

              {/* Variables presentes */}
              {(() => {
                const present = VARIABLES.filter((v) =>
                  selectedTemplate.cuerpo.includes(v.key) || selectedTemplate.asunto.includes(v.key),
                );
                return present.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Variables usadas</p>
                    <div className="flex flex-wrap gap-2">
                      {present.map((v) => (
                        <span key={v.key} className="px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-lg text-[11px] font-mono text-primary">
                          {v.key}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal eliminar / desactivar ──────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-surface rounded-2xl border border-border-subtle p-6 w-full max-w-md shadow-premium mx-4 space-y-4">
            {deleteTarget.enUso ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text">Plantilla en uso</h3>
                    <p className="text-sm text-text-muted mt-1">
                      La plantilla <span className="font-semibold text-text">"{deleteTarget.nombre}"</span> está siendo
                      utilizada en notificaciones y no puede eliminarse.
                    </p>
                    <p className="text-sm text-text-muted mt-2">
                      Reintente la eliminación cuando deje de estar en uso, o <strong>desactívela</strong> para que no esté
                      disponible en nuevas notificaciones.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeactivateConfirm}
                    className="flex-1 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors"
                  >
                    Desactivar plantilla
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text">Eliminar plantilla</h3>
                    <p className="text-sm text-text-muted mt-1">
                      ¿Eliminar <span className="font-semibold text-text">"{deleteTarget.nombre}"</span>?
                      Esta acción no se puede deshacer.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
