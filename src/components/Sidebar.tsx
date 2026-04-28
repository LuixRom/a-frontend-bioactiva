'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/src/store/authStore';
import {
  LayoutDashboard,
  Users,
  Building2,
  Kanban,
  Bell,
  LogOut,
  Upload,
  FileText,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const menuItems: NavItem[] = [
  { href: '/',               label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/organizations',  label: 'Entidades',      icon: Building2 },
  { href: '/contacts',       label: 'Contactos',      icon: Users },
  { href: '/pipeline',       label: 'Pipeline',       icon: Kanban },
  { href: '/quotes',         label: 'Cotizaciones',   icon: FileText },
  { href: '/bulk-upload',    label: 'Importar / Exportar', icon: Upload },
  { href: '/notifications',  label: 'Notificaciones', icon: Bell },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuthStore();

  return (
    <aside
      className="w-64 h-screen flex flex-col bg-surface border-r border-border-subtle sticky top-0 z-20"
    >
      {/* Logo */}
      <div className="px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary">
            <span className="text-white text-xl font-black">B</span>
          </div>
          <div>
            <p className="text-primary font-bold text-base leading-tight">Bioactiva</p>
            <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">CRM System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 group relative',
                isActive
                  ? 'bg-app-bg text-primary'
                  : 'text-text-muted hover:text-primary hover:bg-app-bg/50'
              )}
            >
              <Icon className={cn(
                'w-5 h-5 flex-shrink-0 transition-colors',
                isActive ? 'text-primary' : 'text-text-muted group-hover:text-primary'
              )} />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-border-subtle">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-text-muted hover:text-red-600 hover:bg-red-50 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
