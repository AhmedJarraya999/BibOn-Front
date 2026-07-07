'use client';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueries } from '@tanstack/react-query';
import { ChevronLeft, Radio, CheckCircle2, Clock, AlertCircle, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import api from '@/lib/api';
import { Logo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const POLL_MS = 10_000;

interface Checkpoint {
  id: string;
  name: string;
  order: number;
  type: string;
  cutoffTime?: string | null;
  _count?: { scans: number };
}

interface Scan {
  id: string;
  checkpointId: string;
  registrationId: string;
  scannedAt: string;
}

interface Registration {
  id: string;
  bibNumber: string;
  status: string;
  participant: { id: string; fullName: string };
}

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function CellStatus({ scan, cutoff }: { scan?: Scan; cutoff?: string | null }) {
  if (scan) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
        <span className="text-[9px] text-green-400/70 tabular-nums">{fmt(scan.scannedAt)}</span>
      </div>
    );
  }
  if (cutoff && new Date() > new Date(cutoff)) {
    return <AlertCircle className="h-4 w-4 text-red-400 mx-auto" />;
  }
  return <span className="block h-1.5 w-1.5 rounded-full bg-white/10 mx-auto" />;
}

export default function LiveTrackingPage() {
  const { id, raceId } = useParams<{ id: string; raceId: string }>();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data: raceData } = useQuery({
    queryKey: ['race', raceId],
    queryFn: () => api.get(`/races/${raceId}`).then(r => r.data),
  });

  const { data: checkpoints = [] } = useQuery<Checkpoint[]>({
    queryKey: ['checkpoints', raceId],
    queryFn: () => api.get('/checkpoints', { params: { raceId } }).then(r => r.data),
    refetchInterval: POLL_MS,
  });

  const { data: regsData } = useQuery({
    queryKey: ['registrations-live', raceId],
    queryFn: () => api.get('/registrations', { params: { raceId, limit: 500 } }).then(r => r.data),
    refetchInterval: POLL_MS,
  });

  const registrations: Registration[] = regsData?.data ?? [];
  const sorted = [...checkpoints].sort((a, b) => a.order - b.order);

  const scanQueries = useQueries({
    queries: sorted.map(cp => ({
      queryKey: ['cp-scans', cp.id],
      queryFn: () => api.get(`/checkpoints/${cp.id}/scans`).then(r => r.data as Scan[]),
      refetchInterval: POLL_MS,
    })),
  });

  // Build lookup: registrationId → checkpointId → scan
  const scanMap = useMemo(() => {
    const map: Record<string, Record<string, Scan>> = {};
    scanQueries.forEach((q, idx) => {
      const cp = sorted[idx];
      if (!cp || !q.data) return;
      q.data.forEach((scan) => {
        if (!map[scan.registrationId]) map[scan.registrationId] = {};
        map[scan.registrationId][cp.id] = scan;
      });
    });
    return map;
  }, [scanQueries, sorted]);

  const scansLoading = scanQueries.some(q => q.isLoading);

  // Stats
  const totalPassed = (cpId: string) =>
    scanQueries[sorted.findIndex(c => c.id === cpId)]?.data?.length ?? 0;

  const runnerPassedCount = (regId: string) =>
    Object.keys(scanMap[regId] ?? {}).length;

  const finished = registrations.filter(r => {
    const finishCp = sorted[sorted.length - 1];
    return finishCp && scanMap[r.id]?.[finishCp.id];
  }).length;

  const filtered = registrations.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.bibNumber?.toLowerCase().includes(q) || r.participant?.fullName?.toLowerCase().includes(q);
  });

  const isAllLoading = scansLoading && scanQueries.every(q => !q.data);

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-[#111111]/95 backdrop-blur border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size="sm" variant="dark" />
          <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1">
            <Radio className="h-3 w-3 text-green-400 animate-pulse" />
            <span className="text-xs text-green-400 font-medium">Live</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button onClick={() => router.push(`/events/${id}/races`)}
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
            <ChevronLeft className="h-4 w-4" /> {raceData?.name ?? 'Course'}
          </button>
        </div>
      </div>

      <div className="px-6 py-8">
        {/* Header + stats */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white mb-1">Suivi en temps réel</h1>
          <p className="text-white/40 text-sm">Mise à jour toutes les 10 secondes</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Inscrits', value: registrations.length },
            { label: 'Checkpoints', value: sorted.length },
            { label: 'Finishers', value: finished },
            { label: 'En course', value: registrations.length - finished },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3">
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Checkpoint passage counts */}
        {sorted.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
            {sorted.map(cp => (
              <div key={cp.id} className="flex-shrink-0 rounded-xl border border-white/8 bg-white/3 px-3 py-2 text-center min-w-[90px]">
                <p className="text-xs text-white/40 truncate max-w-[80px]">{cp.name}</p>
                <p className="text-lg font-black text-white mt-0.5">{totalPassed(cp.id)}</p>
                <p className="text-[10px] text-white/25">passages</p>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Dossard ou nom…"
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-[#FF8C00] transition"
          />
        </div>

        {/* Grid */}
        {isAllLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-2 border-[#FF8C00] border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/8">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/8 bg-white/3">
                  <th className="sticky left-0 z-10 bg-[#111111] px-4 py-3 text-left text-xs font-semibold text-white/40 whitespace-nowrap min-w-[160px]">
                    Coureur
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-white/40 whitespace-nowrap min-w-[60px]">
                    Dossard
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-white/40 whitespace-nowrap min-w-[60px]">
                    Avancement
                  </th>
                  {sorted.map(cp => (
                    <th key={cp.id} className="px-3 py-3 text-center text-xs font-semibold text-white/40 whitespace-nowrap max-w-[90px]">
                      <div className="truncate max-w-[80px] mx-auto">{cp.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={3 + sorted.length} className="py-12 text-center text-white/25 text-sm">
                      Aucun coureur trouvé
                    </td>
                  </tr>
                )}
                {filtered.map((reg, rowIdx) => {
                  const passed = runnerPassedCount(reg.id);
                  const finishCp = sorted[sorted.length - 1];
                  const isFinisher = finishCp && !!scanMap[reg.id]?.[finishCp.id];

                  return (
                    <tr key={reg.id}
                      className={`border-b border-white/5 transition-colors ${rowIdx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]'} hover:bg-white/5`}>
                      {/* Name */}
                      <td className="sticky left-0 z-10 bg-inherit px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isFinisher && <span className="text-sm">🏅</span>}
                          <span className="text-white text-sm font-medium truncate max-w-[130px]">
                            {reg.participant?.fullName ?? '—'}
                          </span>
                        </div>
                      </td>

                      {/* Bib */}
                      <td className="px-3 py-3 text-center">
                        <span className="rounded-lg bg-[#FF8C00]/15 px-2 py-0.5 text-xs font-bold text-[#FF8C00]">
                          {reg.bibNumber ?? '—'}
                        </span>
                      </td>

                      {/* Progress bar */}
                      <td className="px-3 py-3 text-center">
                        {sorted.length > 0 ? (
                          <div className="flex items-center gap-1.5 justify-center">
                            <div className="h-1.5 w-16 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#FF8C00] transition-all duration-500"
                                style={{ width: `${sorted.length > 0 ? (passed / sorted.length) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-white/30 tabular-nums">{passed}/{sorted.length}</span>
                          </div>
                        ) : '—'}
                      </td>

                      {/* Checkpoint cells */}
                      {sorted.map(cp => (
                        <td key={cp.id} className="px-3 py-3 text-center">
                          <CellStatus
                            scan={scanMap[reg.id]?.[cp.id]}
                            cutoff={cp.cutoffTime}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
