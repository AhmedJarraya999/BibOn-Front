'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Search, Check, CreditCard, Hash } from 'lucide-react';
import api from '@/lib/api';
import { Logo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useToast } from '@/components/ui/toast';

interface Registration {
  id: string;
  bibNumber: string | null;
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED';
  participant: { id: string; fullName: string; email: string };
  race: { id: string; name: string };
}

function StatusBadge({ status }: { status: Registration['paymentStatus'] }) {
  if (status === 'PAID') return (
    <span className="flex items-center gap-1 rounded-full bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 text-xs font-medium text-green-400">
      <Check className="h-3 w-3" /> Payé
    </span>
  );
  if (status === 'PENDING') return (
    <span className="flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-400">
      <CreditCard className="h-3 w-3" /> En attente
    </span>
  );
  return (
    <span className="rounded-full bg-white/8 px-2.5 py-0.5 text-xs text-white/40">{status}</span>
  );
}

function PickupCard({ reg, onDone }: { reg: Registration; onDone: () => void }) {
  const [bib, setBib] = useState(reg.bibNumber ?? '');
  const [expanded, setExpanded] = useState(false);
  const toast = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: { bibNumber?: string; paymentStatus?: string }) =>
      api.patch(`/registrations/${reg.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pickup-regs'] });
      toast.success('Mis à jour.');
      setExpanded(false);
      onDone();
    },
    onError: () => toast.error('Erreur lors de la mise à jour.'),
  });

  const handleSave = () => {
    if (!bib.trim()) return;
    mutation.mutate({ bibNumber: bib.trim() });
  };

  const handleMarkPaid = () => {
    mutation.mutate({ paymentStatus: 'PAID' });
  };

  const hasBib = !!reg.bibNumber;

  return (
    <div className={`rounded-2xl border transition-all ${expanded ? 'border-[#FF8C00]/40 bg-[#FF8C00]/3' : 'border-white/8 bg-white/3 hover:border-white/15'}`}>
      {/* Row */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        {/* Bib bubble */}
        <div className={`h-12 w-12 flex-shrink-0 rounded-xl flex items-center justify-center text-sm font-black ${hasBib ? 'bg-[#FF8C00]/15 text-[#FF8C00]' : 'bg-white/5 text-white/20'}`}>
          {hasBib ? reg.bibNumber : <Hash className="h-5 w-5" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{reg.participant.fullName}</p>
          <p className="text-xs text-white/35 truncate">{reg.race.name}</p>
        </div>

        {/* Status + collected indicator */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <StatusBadge status={reg.paymentStatus} />
          {hasBib && (
            <span className="text-[10px] text-green-400/70 flex items-center gap-1">
              <Check className="h-2.5 w-2.5" /> Dossard attribué
            </span>
          )}
        </div>
      </button>

      {/* Expanded actions */}
      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-white/8 pt-4">
          {/* Mark paid (only if pending) */}
          {reg.paymentStatus === 'PENDING' && (
            <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-amber-300">Paiement sur place</p>
                <p className="text-xs text-amber-400/60 mt-0.5">Encaisser le paiement avant d'attribuer le dossard</p>
              </div>
              <button
                onClick={handleMarkPaid}
                disabled={mutation.isPending}
                className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-400 disabled:opacity-60 transition-all"
              >
                Marquer payé
              </button>
            </div>
          )}

          {/* Bib assignment */}
          <div>
            <p className="text-xs font-medium text-white/50 mb-2">Numéro de dossard</p>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                value={bib}
                onChange={e => setBib(e.target.value)}
                placeholder="ex. 42"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg font-bold text-white placeholder-white/20 outline-none focus:border-[#FF8C00] transition [color-scheme:dark]"
              />
              <button
                onClick={handleSave}
                disabled={mutation.isPending || !bib.trim() || (reg.paymentStatus === 'PENDING')}
                className="rounded-xl bg-[#FF8C00] px-5 py-3 text-sm font-bold text-white hover:bg-[#e67e00] disabled:opacity-40 transition-all shadow-lg shadow-[#FF8C00]/20"
              >
                {mutation.isPending ? '…' : 'Attribuer'}
              </button>
            </div>
            {reg.paymentStatus === 'PENDING' && (
              <p className="text-xs text-amber-400/60 mt-1.5">Marquer comme payé d'abord</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PickupPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'no-bib' | 'pending'>('no-bib');

  const { data: eventData } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data),
  });

  const { data: racesData } = useQuery({
    queryKey: ['races', id],
    queryFn: () => api.get('/races', { params: { eventId: id, limit: 100 } }).then(r => r.data),
  });
  const races = racesData?.data ?? racesData ?? [];

  const raceQueries = useQueries({
    queries: races.map((race: { id: string }) => ({
      queryKey: ['pickup-regs', race.id],
      queryFn: () => api.get('/registrations', { params: { raceId: race.id, limit: 500 } }).then(r => r.data),
      enabled: races.length > 0,
      refetchInterval: 15_000,
    })),
  });

  const isLoading = races.length === 0 || raceQueries.some(q => q.isLoading);
  const registrations: Registration[] = raceQueries
    .flatMap(q => { const d = q.data as any; return d?.data ?? d ?? []; })
    .filter((r: Registration) => r.race != null && r.participant != null);

  const filtered = registrations.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      r.participant.fullName.toLowerCase().includes(q) ||
      r.participant.email.toLowerCase().includes(q) ||
      (r.bibNumber ?? '').includes(q);

    const matchFilter =
      filter === 'all' ? true :
      filter === 'no-bib' ? !r.bibNumber :
      r.paymentStatus === 'PENDING';

    return matchSearch && matchFilter;
  });

  const noBibCount = registrations.filter(r => !r.bibNumber).length;
  const pendingCount = registrations.filter(r => r.paymentStatus === 'PENDING').length;
  const doneCount = registrations.filter(r => r.bibNumber && r.paymentStatus === 'PAID').length;

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-[#111111]/95 backdrop-blur border-b border-white/8 px-5 py-4 flex items-center justify-between">
        <Logo size="sm" variant="dark" />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button onClick={() => router.push(`/events/${id}`)}
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
            <ChevronLeft className="h-4 w-4" /> {eventData?.name ?? 'Événement'}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-5 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Distribution des dossards</h1>
          <p className="text-white/40 text-sm mt-0.5">{eventData?.name}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Sans dossard', value: noBibCount, color: 'text-amber-400' },
            { label: 'En attente paiement', value: pendingCount, color: 'text-red-400' },
            { label: 'Complétés', value: doneCount, color: 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3 text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-white/35 mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou dossard…"
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-[#FF8C00] transition"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5">
          {([
            { key: 'no-bib', label: `Sans dossard (${noBibCount})` },
            { key: 'pending', label: `En attente (${pendingCount})` },
            { key: 'all', label: 'Tous' },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`rounded-xl px-3 py-2 text-xs font-medium transition-all ${filter === tab.key ? 'bg-[#FF8C00] text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 rounded-full border-2 border-[#FF8C00] border-t-transparent animate-spin" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
            <p className="text-white/25 text-sm">Aucun participant trouvé</p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map(reg => (
            <PickupCard key={reg.id} reg={reg} onDone={() => {}} />
          ))}
        </div>
      </div>
    </div>
  );
}
