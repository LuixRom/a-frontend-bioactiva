'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Plus, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface Organization {
  id: string;
  nombre: string;
}

interface OrgTypeaheadProps {
  options: Organization[];
  value: string;
  onChange: (id: string) => void;
  onCreateNew: (name: string) => void;
  placeholder?: string;
  label?: string;
}

export default function OrgTypeahead({
  options,
  value,
  onChange,
  onCreateNew,
  placeholder = "Buscar organización...",
  label = "Organización",
}: OrgTypeaheadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOrg = options.find(o => o.id === value);
  const filteredOptions = options.filter(o => 
    o.nombre.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
          {label}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between pl-4 pr-3 py-3 bg-surface border border-border-subtle rounded-xl text-sm transition-all text-left",
            isOpen && "border-primary ring-1 ring-primary ring-opacity-20",
            !selectedOrg && "text-text-muted"
          )}
        >
          <span className="truncate">
            {selectedOrg ? selectedOrg.nombre : placeholder}
          </span>
          <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border-subtle rounded-xl shadow-premium z-30 overflow-hidden animate-fade-in">
            <div className="p-2 border-b border-border-subtle flex items-center gap-2 bg-app-bg/30">
              <Search className="w-4 h-4 text-text-muted" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Escribe para buscar..."
                className="w-full bg-transparent text-sm outline-none py-1"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      onChange(org.id);
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-app-bg text-left transition-colors"
                  >
                    <span className={cn(value === org.id && "font-bold text-primary")}>
                      {org.nombre}
                    </span>
                    {value === org.id && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))
              ) : (
                <div className="px-4 py-4 text-sm text-text-muted text-center italic">
                  No se encontraron resultados
                </div>
              )}
            </div>

            {query.trim().length > 0 && !options.some(o => o.nombre.toLowerCase() === query.toLowerCase()) && (
              <button
                onClick={() => {
                  onCreateNew(query);
                  setIsOpen(false);
                  setQuery('');
                }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-primary bg-primary/5 hover:bg-primary/10 transition-colors border-t border-border-subtle"
              >
                <Plus className="w-4 h-4" />
                <span>+ Crear "{query}" como nueva organización</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
