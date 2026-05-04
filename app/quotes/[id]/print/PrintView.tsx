'use client';

import { useEffect } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Quote, Lead, Organization } from '@/src/types/crm';
import { formatCurrency, formatDate } from '@/src/lib/utils';

interface PrintViewProps {
  quote: Quote;
  lead: Lead | null;
  organizacion: Organization | null;
}

export default function PrintView({ quote, lead, organizacion }: PrintViewProps) {
  useEffect(() => {
    document.title = `${quote.id} — BioActiva`;
  }, [quote.id]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-app-bg/40 print:bg-white">
      {/* Toolbar (no se imprime) */}
      <div className="print:hidden bg-surface border-b border-border-subtle sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link
            href="/quotes"
            className="flex items-center gap-2 text-sm font-bold text-text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a cotizaciones
          </Link>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all"
          >
            <Printer className="w-4 h-4" /> Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      {/* Hoja A4 */}
      <div className="max-w-4xl mx-auto px-6 py-8 print:px-0 print:py-0 print:max-w-none">
        <div className="bg-white print:shadow-none shadow-premium rounded-2xl print:rounded-none p-12 print:p-10 space-y-8">
          {/* Membrete */}
          <header className="flex items-start justify-between border-b-2 border-primary pb-6">
            <div>
              <h1 className="text-3xl font-black text-primary leading-tight">BioActiva</h1>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Consultoría en proyectos de innovación
                <br />
                contacto@bioactiva.pe · Lima, Perú
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Cotización
              </p>
              <p className="text-xl font-black text-text">{quote.id}</p>
              <p className="text-[10px] text-text-muted mt-1">
                {quote.mes} {quote.anio}
              </p>
            </div>
          </header>

          {/* Cliente y fecha */}
          <section className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Dirigido a
              </p>
              <p className="text-base font-bold text-text mt-1">{quote.dirigidoA}</p>
              {organizacion && (
                <>
                  <p className="text-sm text-text mt-3">{quote.cliente}</p>
                  {organizacion.ruc && (
                    <p className="text-xs text-text-muted font-mono mt-0.5">
                      RUC: {organizacion.ruc}
                    </p>
                  )}
                  {organizacion.ubicacion && (
                    <p className="text-xs text-text-muted mt-0.5">
                      {organizacion.ubicacion}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="text-right">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Fecha de emisión
              </p>
              <p className="text-sm font-bold text-text mt-1">
                {formatDate(quote.fechaCotizacion)}
              </p>
              {lead && (
                <>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-4">
                    Referencia
                  </p>
                  <p className="text-xs text-text mt-1 font-mono">{lead.id}</p>
                </>
              )}
            </div>
          </section>

          {/* Servicio */}
          <section>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
              Servicio cotizado
            </p>
            <div className="bg-app-bg/50 rounded-xl p-5 border border-border-subtle">
              {quote.producto && (
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">
                  Línea: {quote.producto}
                </p>
              )}
              <p className="text-base font-bold text-text leading-relaxed">{quote.servicio}</p>
              {lead?.servicioInteres && lead.servicioInteres !== quote.servicio && (
                <p className="text-xs text-text-muted mt-2">
                  Oportunidad asociada: {lead.servicioInteres}
                </p>
              )}
            </div>
          </section>

          {/* Tabla de monto */}
          <section>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-primary">
                  <th className="text-left text-[10px] font-bold text-text-muted uppercase tracking-wider py-3">
                    Concepto
                  </th>
                  <th className="text-right text-[10px] font-bold text-text-muted uppercase tracking-wider py-3 w-32">
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border-subtle">
                  <td className="py-4 text-sm text-text">{quote.servicio}</td>
                  <td className="py-4 text-sm text-text text-right font-mono">
                    {formatCurrency(quote.monto, quote.moneda)}
                  </td>
                </tr>
                <tr>
                  <td className="py-4 text-sm font-bold text-text">Total</td>
                  <td className="py-4 text-base font-black text-primary text-right">
                    {formatCurrency(quote.monto, quote.moneda)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Observación */}
          {quote.observacion && (
            <section>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                Observaciones
              </p>
              <p className="text-sm text-text leading-relaxed bg-app-bg/30 p-4 rounded-xl border border-border-subtle">
                {quote.observacion}
              </p>
            </section>
          )}

          {/* Firma */}
          <section className="grid grid-cols-2 gap-12 pt-8">
            <div className="text-center">
              <div className="border-t border-text-muted pt-3">
                <p className="text-sm font-bold text-text">{quote.remitente}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">
                  BioActiva
                </p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-text-muted pt-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">
                  Firma del cliente
                </p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="pt-6 border-t border-border-subtle text-center">
            <p className="text-[10px] text-text-muted">
              BioActiva — Consultoría en innovación · contacto@bioactiva.pe
            </p>
            {quote.linkPropuesta && (
              <p className="text-[10px] text-text-muted mt-1">
                Propuesta extendida: {quote.linkPropuesta}
              </p>
            )}
          </footer>
        </div>
      </div>

      {/* CSS print rules */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          @page {
            size: A4;
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}
