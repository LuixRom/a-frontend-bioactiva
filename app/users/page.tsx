'use client';

import { useState } from 'react';
import { Users, Plus, Eye, Edit3, Trash2 } from 'lucide-react';
import { getInitials } from '@/src/lib/utils';

type CRMUser = {
  id: number;
  name: string;
  email: string;
  active: boolean;
  lastLogin: string;
};

const initialUsers: CRMUser[] = [
  { id: 1, name: 'Karien Diaz',     email: 'karien@bioactiva.pe',    active: true,  lastLogin: 'Hoy 09:15' },
  { id: 2, name: 'Administración',  email: 'admin@bioactiva.pe',     active: true,  lastLogin: 'Hoy 08:40' },
  { id: 3, name: 'Ana Rojas',       email: 'arojas@bioactiva.pe',    active: true,  lastLogin: 'Ayer 17:30' },
  { id: 4, name: 'Luis Torres',     email: 'ltorres@bioactiva.pe',   active: true,  lastLogin: 'Hoy 10:00' },
  { id: 5, name: 'María Quispe',    email: 'mquispe@bioactiva.pe',   active: true,  lastLogin: 'Hace 2 días' },
  { id: 6, name: 'Carlos Mamani',   email: 'cmamani@bioactiva.pe',   active: true,  lastLogin: 'Hoy 07:55' },
  { id: 7, name: 'Rosa Condori',    email: 'rcondori@bioactiva.pe',  active: false, lastLogin: 'Hace 1 sem.' },
];

export default function UsersPage() {
  const [users, setUsers] = useState(initialUsers);
  const [showCreate, setShowCreate] = useState(false);

  const toggleActive = (id: number) =>
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active: !u.active } : u)));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#0f2d1a' }}>Gestión de Usuarios</h1>
          <p className="text-sm" style={{ color: '#9dbfa8' }}>{users.filter(u => u.active).length} usuarios activos · {users.length} en total</p>
        </div>
        <button
          id="create-user-btn"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #1C7E3C, #24a34e)' }}
        >
          <Plus className="w-4 h-4" /> Nuevo Usuario
        </button>
      </div>

      {/* Info notice */}
      <div className="rounded-xl p-4 text-sm" style={{ background: '#F1FFEC', border: '1px solid #BCF7B3', color: '#1C7E3C' }}>
        <strong>Acceso único:</strong> Todos los usuarios del equipo BioActiva tienen acceso completo al sistema. No hay distinción de roles ni restricciones de vista.
      </div>

      {/* Users table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #edfce8', boxShadow: '0 2px 8px rgba(28,126,60,0.06)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: '#f8fdf6', borderBottom: '1px solid #edfce8' }}>
              {['Usuario', 'Correo', 'Último acceso', 'Estado', 'Acciones'].map((h) => (
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
                    <button className="p-1.5 rounded-lg hover:bg-green-50 transition-colors">
                      <Eye className="w-4 h-4" style={{ color: '#4a7c5e' }} />
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-green-50 transition-colors">
                      <Edit3 className="w-4 h-4" style={{ color: '#4a7c5e' }} />
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" style={{ color: '#dc2626' }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden animate-fade-in"
               style={{ background: '#fff', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#edfce8' }}>
              <h2 className="font-bold" style={{ color: '#0f2d1a' }}>Nuevo Usuario</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'Nombre completo', type: 'text' },
                { label: 'Correo electrónico', type: 'email' },
                { label: 'Contraseña temporal', type: 'password' },
              ].map((f) => (
                <div key={f.label}>
                  <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#4a7c5e' }}>{f.label}</label>
                  <input type={f.type} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                         style={{ border: '1.5px solid #c8edcf', background: '#f8fdf6', color: '#0f2d1a' }} />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                        style={{ background: '#F1FFEC', color: '#4a7c5e' }}>Cancelar</button>
                <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                        style={{ background: '#1C7E3C' }}>Crear Usuario</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
