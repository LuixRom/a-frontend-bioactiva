'use client';

import { useState } from 'react';
import { Users, Plus, Eye, Edit3, Trash2, ShieldAlert } from 'lucide-react';
import { getInitials } from '@/src/lib/utils';
import { type CRMUser } from '@/src/lib/mockData';
import { useAuthStore } from '@/src/store/authStore';
import { useToast } from '@/src/components/ui/Toast';
import { useUsersStore } from '@/src/store/usersStore';

export default function UsersPage() {
  const { role } = useAuthStore();
  const { showToast } = useToast();
  const { users, setUsers, addUser, updateUser, deleteUser } = useUsersStore();
  
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<CRMUser | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    rol: 'Trabajador' as 'Administrador' | 'Trabajador',
  });

  const toggleActive = (id: number) => {
    const updated = users.map(u => {
      if (u.id === id) {
        return { ...u, active: !u.active };
      }
      return u;
    });
    setUsers(updated);
    showToast('Estado de usuario actualizado', 'success');
  };

  const handleDelete = (id: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      deleteUser(id);
      showToast('Usuario eliminado correctamente', 'success');
    }
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', rol: 'Trabajador' });
    setShowModal(true);
  };

  const handleOpenEdit = (user: CRMUser) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, password: '', rol: user.rol });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      showToast('Por favor, completa los campos obligatorios', 'error');
      return;
    }

    if (editingUser) {
      // Editar
      const updated: CRMUser = {
        ...editingUser,
        name: formData.name,
        email: formData.email,
        rol: formData.rol,
      };
      updateUser(updated);
      showToast('Usuario actualizado correctamente', 'success');
    } else {
      // Crear
      const newId = Math.max(...users.map(u => u.id), 0) + 1;
      const newUser: CRMUser = {
        id: newId,
        name: formData.name,
        email: formData.email,
        active: true,
        lastLogin: 'Nunca',
        rol: formData.rol,
      };
      addUser(newUser);
      showToast('Usuario creado correctamente', 'success');
    }
    setShowModal(false);
  };

  if (role !== 'Administrador') {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4 animate-fade-in text-center">
        <ShieldAlert className="w-16 h-16 text-red-500/50" />
        <h2 className="text-2xl font-black text-text">Acceso Denegado</h2>
        <p className="text-text-muted">No tienes los permisos necesarios para gestionar usuarios.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#0f2d1a' }}>Gestión de Usuarios</h1>
          <p className="text-sm" style={{ color: '#9dbfa8' }}>{users.filter(u => u.active).length} usuarios activos · {users.length} en total</p>
        </div>
        <button
          id="create-user-btn"
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #1C7E3C, #24a34e)' }}
        >
          <Plus className="w-4 h-4" /> Nuevo Usuario
        </button>
      </div>

      <div className="rounded-xl p-4 text-sm" style={{ background: '#F1FFEC', border: '1px solid #BCF7B3', color: '#1C7E3C' }}>
        <strong>Gestión de Roles:</strong> Solo los administradores pueden gestionar usuarios. Los trabajadores tienen acceso operativo.
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #edfce8', boxShadow: '0 2px 8px rgba(28,126,60,0.06)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: '#f8fdf6', borderBottom: '1px solid #edfce8' }}>
              {['Usuario', 'Rol', 'Correo', 'Último acceso', 'Estado', 'Acciones'].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: '#4a7c5e' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b last:border-b-0 hover:bg-green-50 transition-colors" style={{ borderColor: '#edfce8' }}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs"
                         style={{ background: '#1C7E3C' }}>
                      {getInitials(user.name)}
                    </div>
                    <p className="text-sm font-semibold" style={{ color: '#0f2d1a' }}>{user.name}</p>
                  </div>
                </td>
                <td className="px-5 py-3 text-xs" style={{ color: '#4a7c5e' }}>
                  <span className="px-2 py-1 rounded bg-green-50 text-green-700 font-medium">
                    {user.rol}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs" style={{ color: '#4a7c5e' }}>{user.email}</td>
                <td className="px-5 py-3 text-xs" style={{ color: '#9dbfa8' }}>{user.lastLogin}</td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => toggleActive(user.id)}
                    className="text-xs font-semibold px-3 py-1 rounded-full transition-all"
                    style={user.active
                      ? { background: '#F1FFEC', color: '#1C7E3C' }
                      : { background: '#fef2f2', color: '#dc2626' }}
                  >
                    {user.active ? '● Activo' : '○ Inactivo'}
                  </button>
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => handleOpenEdit(user)}
                      className="p-1.5 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" style={{ color: '#4a7c5e' }} />
                    </button>
                    <button 
                      onClick={() => handleDelete(user.id)}
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

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden animate-fade-in"
               style={{ background: '#fff', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#edfce8' }}>
              <h2 className="font-bold" style={{ color: '#0f2d1a' }}>
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#4a7c5e' }}>Nombre completo *</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: '1.5px solid #c8edcf', background: '#f8fdf6', color: '#0f2d1a' }} 
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#4a7c5e' }}>Correo electrónico *</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: '1.5px solid #c8edcf', background: '#f8fdf6', color: '#0f2d1a' }} 
                />
              </div>
              {!editingUser && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#4a7c5e' }}>Contraseña temporal</label>
                  <input 
                    type="password" 
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: '1.5px solid #c8edcf', background: '#f8fdf6', color: '#0f2d1a' }} 
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#4a7c5e' }}>Rol</label>
                <select 
                  value={formData.rol}
                  onChange={e => setFormData({ ...formData, rol: e.target.value as 'Administrador' | 'Trabajador' })}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" 
                  style={{ border: '1.5px solid #c8edcf', background: '#f8fdf6', color: '#0f2d1a' }}
                >
                  <option value="Trabajador">Trabajador</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                        style={{ background: '#F1FFEC', color: '#4a7c5e' }}>Cancelar</button>
                <button 
                  onClick={handleSave}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: '#1C7E3C' }}>
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
