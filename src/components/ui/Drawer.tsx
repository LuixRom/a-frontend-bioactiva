'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/src/lib/utils';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
  /**
   * Si es true, no oscurece el fondo y no bloquea la interacción con
   * el resto de la página. Útil para paneles de detalle (lectura)
   * donde el usuario puede querer seguir scrolleando el dashboard.
   * Por defecto: false (modal clásico).
   */
  transparentBackground?: boolean;
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  width = 'w-[35%]',
  transparentBackground = false,
}: DrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
    } else {
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Safety net: si por cualquier motivo otro componente dejó body con
  // overflow=hidden, lo limpiamos. Esto garantiza que jamás quede
  // paralizado el scroll de la página.
  useEffect(() => {
    if (document.body.style.overflow === 'hidden') {
      document.body.style.overflow = '';
    }
    return () => {
      if (document.body.style.overflow === 'hidden') {
        document.body.style.overflow = '';
      }
    };
  }, []);

  if (!mounted && !isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-end',
        // Modo transparente: el wrapper no captura wheel/click salvo en
        // el contenido del drawer. Así el dashboard de fondo sigue siendo
        // scrolleable y clickable mientras el panel está visible.
        transparentBackground && 'pointer-events-none',
      )}
    >
      {/* Overlay (oculto en modo transparente) */}
      {!transparentBackground && (
        <div
          className={cn(
            'absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300',
            isOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={onClose}
        />
      )}

      {/* Drawer Content */}
      <div
        className={cn(
          'relative h-full bg-surface shadow-drawer animate-drawer-in flex flex-col transition-transform duration-300',
          width,
          isOpen ? 'translate-x-0' : 'translate-x-full',
          // Re-habilitar interacción dentro del drawer cuando el wrapper
          // exterior la inhibe.
          transparentBackground && 'pointer-events-auto',
        )}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-xl font-bold text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-app-bg text-text-muted hover:text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">{children}</div>
      </div>
    </div>
  );
}
