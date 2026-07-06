'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, CheckCircle, Clock, XCircle, AlertCircle, Download, ChevronLeft, Filter } from 'lucide-react';
import api from '@/lib/api';
import { Logo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useToast } from '@/components/ui/toast';
import { Modal } from '@/components/ui/modal';
import { RegistrationForm } from '@/components/registrations/registration-form';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  REGISTERED:    { label: 'Inscrit',     color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  CHECKED_IN:    { label: 'Checké',      color: 'bg-green-500/15 text-green-400 border-green-500/20' },
  FINISHED:      { label: 'Terminé',     color: 'bg-[#FF8C00]/15 text-[#FF8C00] border-[#FF8C00]/20' },
  DNF:           { label: 'Abandon',     color: 'bg-red-500/15 text-red-400 border-red-500/20' },
  DISQUALIFIED:  { label: 'Disqualifié', color: 'bg-red-500/15 text-red-400 border-red-500/20' },
};

const PAY_LABELS: Record<string, { label: string; color: string }> = {
  PAID:    { label: 'Payé',    color: 'bg-green-500/15 text-green-400' },
  PENDING: { label: 'En attente', color: 'bg-amber-500/15 text-amber-400' },
  REFUNDED:{ label: 'Remboursé', color: 'bg-white/10 text-white/40' },
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  REGISTERED: <Clock className="h-3.5 w-3.5" />,
  CHECKED_IN: <CheckCircle className="h-3.5 w-3.5" />,
  FINISHED:   <CheckCircle className="h-3.5 w-3.5" />,
  DNF:        <XCircle className="h-3.5 w-3.5" />,
  DISQUALIFIED:<AlertCircle className="h-3.5 w-3.5" />,
};

export default function RegistrationsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [raceFilter, setRaceFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { data: eventData } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data),
  });

  const { data: racesData } = useQuery({
    queryKey: ['event-races', id],
    queryFn: () => api.get('/races', { params: { eventId: id, limit: 100 } }).then(r => r.data),
  });
  const races = racesData?.data ?? racesData ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['registrations', id, page, search, statusFilter, raceFilter],
    queryFn: () => api.get('/registrations', {
      params: { eventId: id, page, limit: 20, search: search || undefined, status: statusFilter || undefined, raceId: raceFilter || undefined }
    }).then(r => r.data),
  });
  const registrations = data?.data ?? data ?? [];
  const total = data?.total ?? registrations.length;

  const updateStatus = useMutation({
    mutationFn: ({ regId, status }: { regId: string; status: string }) =>
      api.patch(`/registrations/${regId}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['registrations'] }); toast.success('Statut mis à jour'); },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const stats = {
    total,
    checkedIn: registrations.filter((r: any) => r.status === 'CHECKED_IN' || r.status === 'FINISHED').length,
    paid: registrations.filter((r: any) => r.paymentStatus === 'PAID').length,
  };

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-[#111111]/95 backdrop-blur border-b border-white/8 px-8 py-4 flex items-center justify-between">
        <Logo size="sm" variant="dark" />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button onClick={() => router.push(`/events/${id}`)} className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
            <ChevronLeft className="h-4 w-4" /> {eventData?.name ?? 'Événement'}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white">Inscriptions</h1>
            <p className="text-white/40 text-sm mt-0.5">{total} participant{total !== 1 ? 's' : ''} au total</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/60 hover:bg-white/10 transition-colors">
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button onClick={() => setAddOpen(true)} className="flex items-center gap-2 rounded-xl bg-[#FF8C00] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#e67e00] shadow-lg shadow-[#FF8C00]/20 transition-all hover:scale-[1.02]">
              <Plus className="h-4 w-4" /> Ajouter manuellement
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Inscrits', value: stats.total, color: 'text-white' },
            { label: 'Checkés', value: stats.checkedIn, color: 'text-green-400' },
            { label: 'Payés', value: stats.paid, color: 'text-[#FF8C00]' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-white/8 bg-white/3 px-5 py-4">
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-sm text-white/40 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un participant…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-white placeholder-white/25 outline-none focus:border-[#FF8C00] focus:ring-2 focus:ring-[#FF8C00]/20" />
          </div>
          <select value={raceFilter} onChange={e => setRaceFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/70 outline-none focus:border-[#FF8C00] [&>option]:bg-[#1a1a1a]">
            <option value="">Toutes les courses</option>
            {races.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/70 outline-none focus:border-[#FF8C00] [&>option]:bg-[#1a1a1a]">
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-0 border-b border-white/8 px-5 py-3">
            {['Dossard', 'Participant', 'Course', 'Statut', 'Paiement', 'Actions'].map(h => (
              <p key={h} className="text-xs font-bold text-white/30 uppercase tracking-wider">{h}</p>
            ))}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 rounded-full border-2 border-[#FF8C00] border-t-transparent animate-spin" />
            </div>
          )}

          {!isLoading && registrations.length === 0 && (
            <div className="text-center py-16">
              <p className="text-white/25 text-sm">Aucune inscription trouvée</p>
              <button onClick={() => setAddOpen(true)} className="mt-3 text-[#FF8C00] text-sm hover:underline">+ Ajouter le premier participant</button>
            </div>
          )}

          {!isLoading && registrations.map((reg: any) => {
            const st = STATUS_LABELS[reg.status] ?? { label: reg.status, color: 'bg-white/10 text-white/40' };
            const pay = PAY_LABELS[reg.paymentStatus] ?? { label: reg.paymentStatus, color: 'bg-white/10 text-white/40' };
            return (
              <div key={reg.id} className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-0 items-center px-5 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                <div className="w-16">
                  <span className="inline-flex items-center justify-center rounded-lg bg-[#FF8C00]/15 text-[#FF8C00] font-black text-sm h-8 w-12">
                    {reg.bibNumber ?? '—'}
                  </span>
                </div>
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-semibold text-white truncate">{reg.participant?.fullName ?? '—'}</p>
                  <p className="text-xs text-white/35 truncate">{reg.participant?.email ?? ''}</p>
                </div>
                <p className="text-sm text-white/60 truncate pr-4">{reg.race?.name ?? '—'}</p>
                <div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${st.color}`}>
                    {STATUS_ICONS[reg.status]} {st.label}
                  </span>
                </div>
                <div>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${pay.color}`}>{pay.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <select value={reg.status} onChange={e => updateStatus.mutate({ regId: reg.id, status: e.target.value })}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/60 outline-none focus:border-[#FF8C00] [&>option]:bg-[#1a1a1a]">
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 hover:bg-white/10 disabled:opacity-30 transition-colors">← Précédent</button>
            <span className="text-sm text-white/40">Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={registrations.length < 20}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 hover:bg-white/10 disabled:opacity-30 transition-colors">Suivant →</button>
          </div>
        )}
      </div>

      {/* Add registration modal */}
      {addOpen && (
        <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Ajouter un participant">
          <RegistrationForm
            onSuccess={() => { setAddOpen(false); qc.invalidateQueries({ queryKey: ['registrations'] }); toast.success('Participant ajouté !'); }}
          />
        </Modal>
      )}
    </div>
  );
}
