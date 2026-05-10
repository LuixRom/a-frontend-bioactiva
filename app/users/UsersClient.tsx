'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Edit3, Trash2, ShieldAlert, KeyRound, Mail,
} from 'lucide-react';
import { getInitials, cn } from '@/src/lib/utils';
import { useAuthStore } from '@/src/store/authStore';
import { useToast } from '@/src/components/ui/Toast';
import {
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
} from '@/src/server/actions/users';
import type { PublicUser } from '@/src/server/types';

import { listInvitations, inviteUser, type UserInvitationPublic } from '@/src/server/actions/invitations';
import InvitationsList from './InvitationsList';

interface UsersClientProps {
  initialUsers: PublicUser[];
  initialInvitations: UserInvitationPublic[];
}

type Mode = 'create' | 'edit-info' | 'change-password' | null;

const ROLES = ['Trabajador', 'Administrador'] as const;

function formatLastLogin(d: Date | null): string {
  if (!d) return 'Nunca';
  const now = new Date();
  const last = new Date(d);
  const diffMs = now.getTime() - last.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const sameDay = last.toDateString() === now.toDateString();
  const time = last.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Hoy ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (last.toDateString() === yesterday.toDateString()) return `Ayer ${time}`;
  const days = Math.floor(diffMs / 86_400_000);
  if (days < 7)  return `Hace ${days} días`;
  if (days < 14) return 'Hace 1 sem.';
  if (days < 60) return `Hace ${Math.floor(days / 7)} sem.`;
  return last.toLocaleDateString('es-PE');
}

export default function UsersClient({ initialUsers, initialInvitations }: UsersClientProps) {
  const router = useRouter();
  const { role } = useAuthStore();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [users, setUsers] = useState<PublicUser[]>(initialUsers);
  const [invitations, setInvitations] = useState<UserInvitationPublic[]>(initialInvitations);
  const [activeTab, setActiveTab] = useState<'usuarios' | 'invitaciones'>('usuarios');
  
  const [mode, setMode] = useState<Mode>(null);
  const [editing, setEditing] = useState<PublicUser | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Trabajador' as PublicUser['role'],
  });

  const resetForm = () =>
    setFormData({ name: '', email: '', password: '', confirmPassword: '', role: 'Trabajador' });

  const handleOpenCreate = () => {
    setEditing(null);
    resetForm();
    setMode('create');
  };

  const handleOpenEditInfo = (u: PublicUser) => {
    setEditing(u);
    setFormData({
      name: u.name,
      email: u.email,
      password: '',
      confirmPassword: '',
      role: u.role,
    });
    setMode('edit-info');
  };

  const handleOpenChangePassword = (u: PublicUser) => {
    setEditing(u);
    setFormData((f) => ({ ...f, password: '', confirmPassword: '' }));
    setMode('change-password');
  };

  const handleClose = () => {
    setMode(null);
    setEditing(null);
    resetForm();
  };

  const handleSubmit = () => {
    if (mode === 'create') {
      const email = formData.email.trim().toLowerCase();
      
      // 1. Campos completos
      if (!email || !formData.role) {
        showToast('Campos obligatorios para el envío del correo', 'error');
        return;
      }

      // 2. Dominio institucional
      if (!email.endsWith('@bioactiva.pe')) {
        showToast('El correo no pertenece al dominio institucional (@bioactiva.pe)', 'error');
        return;
      }

      // 3. Ya registrado
      const alreadyUser = users.find(u => u.email.toLowerCase() === email);
      const alreadyInvited = invitations.find(i => i.email.toLowerCase() === email && i.status === 'Enviada');
      
      if (alreadyUser) {
        showToast('El correo ya está registrado como usuario activo', 'error');
        return;
      }
      if (alreadyInvited) {
        showToast('Ya existe una invitación pendiente para este correo', 'error');
        return;
      }

      startTransition(async () => {
        try {
          await inviteUser(email, formData.role);
          showToast('Invitación enviada correctamente', 'success');
          
          // Recargar invitaciones
          const updatedInvs = await listInvitations();
          setInvitations(updatedInvs);
          
          handleClose();
          router.refresh();
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Error al enviar invitación', 'error');
        }
      });
      return;
    }

    if (mode === 'edit-info' && editing) {
      if (!formData.name.trim() || !formData.email.trim()) {
        showToast('Nombre y correo son obligatorios', 'error');
        return;
      }
      startTransition(async () => {
        try {
          const updated = await updateUser(editing.id, {
            email: formData.email,
            name:  formData.name,
            role:  formData.role,
          });
          setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
          showToast('Datos actualizados', 'success');
          handleClose();
          router.refresh();
        } catch (err) {
          showToast(
            err instanceof Error ? err.message : 'Error al actualizar usuario',
            'error',
          );
        }
      });
      return;
    }

    if (mode === 'change-password' && editing) {
      if (!formData.password || formData.password.length < 6) {
        showToast('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        showToast('Las contraseñas no coinciden', 'error');
        return;
      }
      startTransition(async () => {
        try {
          await updateUserPassword(editing.id, formData.password);
          showToast(`Contraseña de ${editing.name} actualizada`, 'success');
          handleClose();
        } catch (err) {
          showToast(
            err instanceof Error ? err.message : 'Error al cambiar contraseña',
            'error',
          );
        }
      });
      return;
    }
  };

  const handleToggleActive = (u: PublicUser) => {
    startTransition(async () => {
      try {
        const updated = await updateUser(u.id, { active: !u.active });
        setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        showToast(updated.active ? 'Usuario activado' : 'Usuario desactivado', 'success');
        router.refresh();
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'Error al cambiar estado',
          'error',
        );
      }
    });
  };

  const handleDelete = (u: PublicUser) => {
    if (!confirm(`¿Eliminar al usuario ${u.name} (${u.email})?`)) return;
    startTransition(async () => {
      try {
        await deleteUser(u.id);
        setUsers((prev) => prev.filter((x) => x.id !== u.id));
        showToast('Usuario eliminado', 'success');
        router.refresh();
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'Error al eliminar usuario',
          'error',
        );
      }
    });
  };

  if (role !== 'Administrador') {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4 animate-fade-in text-center">
        <ShieldAlert className="w-16 h-16 text-red-500/50" />
        <h2 className="text-2xl font-black text-text">Acceso Denegado</h2>
        <p className="text-text-muted">
          No tienes los permisos necesarios para gestionar usuarios.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#0f2d1a' }}>
            Gestión de Usuarios
          </h1>
          <p className="text-sm" style={{ color: '#9dbfa8' }}>
            {users.filter((u) => u.active).length} usuarios activos · {users.length}{' '}
            en total
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #1C7E3C, #24a34e)' }}
        >
          <Plus className="w-4 h-4" /> Invitar Usuario
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b p-1" style={{ borderColor: '#edfce8' }}>
        <button
          onClick={() => setActiveTab('usuarios')}
          className={cn(
            "px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all border-b-2",
            activeTab === 'usuarios' 
              ? "border-primary text-primary" 
              : "border-transparent text-text-muted hover:text-text"
          )}
        >
          Usuarios Activos
        </button>
        <button
          onClick={() => setActiveTab('invitaciones')}
          className={cn(
            "px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all border-b-2",
            activeTab === 'invitaciones' 
              ? "border-primary text-primary" 
              : "border-transparent text-text-muted hover:text-text"
          )}
        >
          Invitaciones Enviadas
        </button>
      </div>

      <div
        className="rounded-xl p-4 text-sm"
        style={{
          background: '#F1FFEC',
          border: '1px solid #BCF7B3',
          color: '#1C7E3C',
        }}
      >
        {activeTab === 'usuarios' ? (
          <>
            <strong>Gestión de Roles:</strong> los administradores pueden crear,
            editar y desactivar usuarios. Las contraseñas se guardan hasheadas con
            bcrypt — nunca se exponen al cliente.
          </>
        ) : (
          <>
            <strong>Control de Invitaciones:</strong> Se listan los correos a los que se ha enviado invitación. 
            Los usuarios deben activar su cuenta mediante el enlace enviado para aparecer en la lista de usuarios activos.
          </>
        )}
      </div>

      {activeTab === 'usuarios' ? (
        <div 
          className="rounded-2xl overflow-hidden"
          style={{
            background: '#fff',
            border: '1px solid #edfce8',
            boxShadow: '0 2px 8px rgba(28,126,60,0.06)',
          }}
        >
        <table className="w-full">
          <thead>
            <tr style={{ background: '#f8fdf6', borderBottom: '1px solid #edfce8' }}>
              {['Usuario', 'Rol', 'Correo', 'Último acceso', 'Estado', 'Acciones'].map(
                (h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide"
                    style={{ color: '#4a7c5e' }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b last:border-b-0 hover:bg-green-50 transition-colors"
                style={{ borderColor: '#edfce8' }}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs"
                      style={{ background: '#1C7E3C' }}
                    >
                      {getInitials(u.name)}
                    </div>
                    <p className="text-sm font-semibold" style={{ color: '#0f2d1a' }}>
                      {u.name}
                    </p>
                  </div>
                </td>
                <td className="px-5 py-3 text-xs">
                  <span className="px-2 py-1 rounded bg-green-50 text-green-700 font-medium">
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs" style={{ color: '#4a7c5e' }}>
                  {u.email}
                </td>
                <td className="px-5 py-3 text-xs" style={{ color: '#9dbfa8' }}>
                  {formatLastLogin(u.lastLogin)}
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => handleToggleActive(u)}
                    className="text-xs font-semibold px-3 py-1 rounded-full transition-all"
                    style={
                      u.active
                        ? { background: '#F1FFEC', color: '#1C7E3C' }
                        : { background: '#fef2f2', color: '#dc2626' }
                    }
                  >
                    {u.active ? '● Activo' : '○ Inactivo'}
                  </button>
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleOpenEditInfo(u)}
                      title="Editar datos"
                      className="p-1.5 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" style={{ color: '#4a7c5e' }} />
                    </button>
                    <button
                      onClick={() => handleOpenChangePassword(u)}
                      title="Cambiar contraseña"
                      className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                    >
                      <KeyRound className="w-4 h-4" style={{ color: '#d97706' }} />
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      title="Eliminar usuario"
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" style={{ color: '#dc2626' }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      ) : (
        <InvitationsList invitations={invitations} />
      )}

      {mode && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden animate-fade-in"
            style={{ background: '#fff', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
          >
            <div
              className="px-6 py-4 border-b flex items-center justify-between"
              style={{ borderColor: '#edfce8' }}
            >
              <h2 className="font-bold" style={{ color: '#0f2d1a' }}>
                {mode === 'create' && 'Invitar Nuevo Usuario'}
                {mode === 'edit-info' && `Editar datos · ${editing?.name}`}
                {mode === 'change-password' && `Cambiar contraseña · ${editing?.name}`}
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Datos del usuario (en create y edit-info) */}
              {mode !== 'change-password' && (
                <>
                  {mode === 'create' && (
                    <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-start gap-3 mb-4">
                      <Mail className="w-5 h-5 text-green-600 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-green-800">Flujo de Invitación</p>
                        <p className="text-xs text-green-700/70 leading-relaxed">
                          Se enviará un correo de activación. El usuario definirá sus credenciales al activar su cuenta.
                        </p>
                      </div>
                    </div>
                  )}

                  {mode !== 'create' && (
                    <div>
                      <label
                        className="text-xs font-semibold uppercase tracking-wide block mb-1.5"
                        style={{ color: '#4a7c5e' }}
                      >
                        Nombre completo *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{
                          border: '1.5px solid #c8edcf',
                          background: '#f8fdf6',
                          color: '#0f2d1a',
                        }}
                        placeholder="Nombre y apellido"
                      />
                    </div>
                  )}
                  <div>
                    <label
                      className="text-xs font-semibold uppercase tracking-wide block mb-1.5"
                      style={{ color: '#4a7c5e' }}
                    >
                      Correo electrónico *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none disabled:opacity-50"
                      style={{
                        border: '1.5px solid #c8edcf',
                        background: '#f8fdf6',
                        color: '#0f2d1a',
                      }}
                      placeholder="correo@bioactiva.pe"
                      disabled={mode === 'edit-info'}
                    />
                    {mode === 'create' && !formData.email.endsWith('@bioactiva.pe') && formData.email.includes('@') && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">El correo debe pertenecer al dominio @bioactiva.pe</p>
                    )}
                  </div>
                  <div>
                    <label
                      className="text-xs font-semibold uppercase tracking-wide block mb-1.5"
                      style={{ color: '#4a7c5e' }}
                    >
                      Rol
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          role: e.target.value as PublicUser['role'],
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{
                        border: '1.5px solid #c8edcf',
                        background: '#f8fdf6',
                        color: '#0f2d1a',
                      }}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Password (solo en change-password — en create el usuario la define al activar) */}
              {mode === 'change-password' && (
                <>
                  <div>
                    <label
                      className="text-xs font-semibold uppercase tracking-wide block mb-1.5"
                      style={{ color: '#4a7c5e' }}
                    >
                      {mode === 'change-password' ? 'Nueva contraseña *' : 'Contraseña *'}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{
                        border: '1.5px solid #c8edcf',
                        background: '#f8fdf6',
                        color: '#0f2d1a',
                      }}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div>
                    <label
                      className="text-xs font-semibold uppercase tracking-wide block mb-1.5"
                      style={{ color: '#4a7c5e' }}
                    >
                      Confirmar contraseña *
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, confirmPassword: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{
                        border: '1.5px solid #c8edcf',
                        background: '#f8fdf6',
                        color: '#0f2d1a',
                      }}
                      placeholder="Repite la contraseña"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: '#F1FFEC', color: '#4a7c5e' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: '#1C7E3C' }}
                  disabled={isPending || (mode === 'create' && (!formData.email.trim() || !formData.email.endsWith('@bioactiva.pe')))}
                >
                  {mode === 'create' ? (isPending ? 'Enviando...' : 'Enviar invitación') : 'Guardar cambios'}
                  {mode === 'change-password' && 'Actualizar contraseña'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
