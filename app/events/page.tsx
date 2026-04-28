'use client';

import { CalendarDays, Plus, MapPin, Users, Clock } from 'lucide-react';

const events = [
  { id: 1, title: 'Feria Agro Lima 2024',       date: '15 Jun 2024', time: '09:00 - 18:00', location: 'Centro de Expo Lima',   attendees: 0, leads: 0, status: 'próximo' },
  { id: 2, title: 'Workshop Sostenibilidad',    date: '22 Jun 2024', time: '10:00 - 13:00', location: 'Hotel Los Delfines',      attendees: 0, leads: 0, status: 'próximo' },
  { id: 3, title: 'Expo Agro Norte 2024',       date: '08 Abr 2024', time: '08:00 - 17:00', location: 'Trujillo Convention Ctr', attendees: 210, leads: 47, status: 'completado' },
  { id: 4, title: 'Jornada Técnica Piura',      date: '22 Mar 2024', time: '09:00 - 12:00', location: 'Hotel Costa del Sol',     attendees: 85,  leads: 18, status: 'completado' },
];

export default function EventsPage() {
  const upcoming = events.filter((e) => e.status === 'próximo');
  const past     = events.filter((e) => e.status === 'completado');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#0f2d1a' }}>Eventos</h1>
          <p className="text-sm" style={{ color: '#9dbfa8' }}>Ferias, workshops y jornadas comerciales</p>
        </div>
        <button
          id="create-event-btn"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #1C7E3C, #24a34e)' }}
        >
          <Plus className="w-4 h-4" /> Nuevo Evento
        </button>
      </div>

      {/* Upcoming */}
      <div>
        <h2 className="text-sm font-bold mb-3" style={{ color: '#0f2d1a' }}>Próximos eventos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcoming.map((e) => (
            <div key={e.id} className="rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
                 style={{ background: '#fff', border: '1.5px solid #1C7E3C44', boxShadow: '0 2px 8px rgba(28,126,60,0.1)' }}>
              <div className="px-5 py-2 text-xs font-bold" style={{ background: '#F1FFEC', color: '#1C7E3C' }}>
                PRÓXIMO
              </div>
              <div className="p-5">
                <h3 className="font-bold mb-3" style={{ color: '#0f2d1a' }}>{e.title}</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm" style={{ color: '#4a7c5e' }}>
                    <CalendarDays className="w-4 h-4" /> {e.date}
                  </div>
                  <div className="flex items-center gap-2 text-sm" style={{ color: '#4a7c5e' }}>
                    <Clock className="w-4 h-4" /> {e.time}
                  </div>
                  <div className="flex items-center gap-2 text-sm" style={{ color: '#4a7c5e' }}>
                    <MapPin className="w-4 h-4" /> {e.location}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                          style={{ background: '#1C7E3C' }}>Gestionar</button>
                  <button className="px-4 py-2 rounded-xl text-sm font-medium"
                          style={{ background: '#F1FFEC', color: '#1C7E3C' }}>Carga masiva</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Past */}
      <div>
        <h2 className="text-sm font-bold mb-3" style={{ color: '#0f2d1a' }}>Eventos pasados</h2>
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #edfce8' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: '#f8fdf6', borderBottom: '1px solid #edfce8' }}>
                {['Evento', 'Fecha', 'Ubicación', 'Asistentes', 'Leads generados'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: '#4a7c5e' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {past.map((e) => (
                <tr key={e.id} className="border-b last:border-b-0 hover:bg-green-50 transition-colors" style={{ borderColor: '#edfce8' }}>
                  <td className="px-5 py-3 font-semibold text-sm" style={{ color: '#0f2d1a' }}>{e.title}</td>
                  <td className="px-5 py-3 text-sm" style={{ color: '#4a7c5e' }}>{e.date}</td>
                  <td className="px-5 py-3 text-sm" style={{ color: '#4a7c5e' }}>{e.location}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 text-sm" style={{ color: '#0f2d1a' }}>
                      <Users className="w-3.5 h-3.5" style={{ color: '#4a7c5e' }} />
                      <span className="font-bold">{e.attendees}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-bold text-sm px-2.5 py-1 rounded-full"
                          style={{ background: '#F1FFEC', color: '#1C7E3C' }}>{e.leads} leads</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
