'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, QrCode, CheckCircle, User, Award, RotateCcw } from 'lucide-react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { CountryFlag } from '@/components/ui/country-flag';
import { type Race, type Registration } from '@/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { VolunteerStats } from '@/components/volunteer/volunteer-stats';
import { useRecentActions } from '@/hooks/use-recent-actions';
import { sounds } from '@/lib/sounds';

const QrScanner = dynamic(() => import('@/components/checkin/qr-scanner').then((m) => m.QrScanner), { ssr: false });

export default function MedalsPage() {
  const [raceId, setRaceId] = useState('');
  const [search, setSearch] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [selected, setSelected] = useState<Registration | null>(null);
  const [scanning, setScanning] = useState(false);
  const [multiResults, setMultiResults] = useState<Registration[]>([]);
  const [statsKey, setStatsKey] = useState(0);

  const searchRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const queryClient = useQueryClient();
  const { actions, push: pushAction, remove: removeAction } = useRecentActions();

  useEffect(() => {
    if (raceId) setTimeout(() => searchRef.current?.focus(), 100);
  }, [raceId]);

  function refreshAll() {
    queryClient.invalidateQueries({ queryKey: ['medals-regs', raceId] });
    setStatsKey((k) => k + 1);
  }

  const { data: racesData } = useQuery({
    queryKey: ['races-medals'],
    queryFn: () => api.get('/races', { params: { limit: 100 } }).then((r) => r.data),
  });
  const races: Race[] = racesData?.data ?? [];

  const { data: allRegsData, isLoading: listLoading } = useQuery({
    queryKey: ['medals-regs', raceId],
    queryFn: () => api.get('/registrations', { params: { raceId, limit: 1000 } }).then((r) => r.data),
    enabled: !!raceId,
  });
  const allRegs: Registration[] = allRegsData?.data ?? [];

  const filteredRegs = listSearch.trim()
    ? allRegs.filter((r) => {
        const q = listSearch.toLowerCase();
        return (
          r.participant?.fullName?.toLowerCase().includes(q) ||
          r.participant?.email?.toLowerCase().includes(q) ||
          r.bibNumber?.toLowerCase().includes(q)
        );
      })
    : allRegs;

  const lookupById = async (id: string) => {
    try {
      const res = await api.get(`/registrations/${id}`);
      setSelected(res.data);
      setMultiResults([]);
    } catch {
      toast.error('Registration not found.');
    }
  };

  const lookupMutation = useMutation({
    mutationFn: (q: string) =>
      api.get('/registrations/lookup', { params: { raceId, search: q } }).then((r) => r.data),
    onSuccess: (data: Registration[]) => {
      if (data.length === 1) { setSelected(data[0]); setMultiResults([]); sounds.success(); lookupById(data[0].id); }
      else if (data.length > 1) { setSelected(null); setMultiResults(data); }
      else { sounds.error(); toast.error('No participant found.'); }
    },
  });

  const distributeMutation = useMutation({
    mutationFn: (registrationId: string) =>
      api.post(`/registrations/${registrationId}/distributions`, { itemType: 'MEDAL' }),
    onSuccess: (_, registrationId) => {
      sounds.success();
      pushAction(`🥇 ${selected?.participant?.fullName} — medal issued`, async () => {
        await api.delete(`/registrations/${registrationId}/distributions/MEDAL`);
        if (selected) lookupById(selected.id);
        refreshAll();
      });
      if (selected) lookupById(selected.id);
      refreshAll();
    },
    onError: () => { sounds.error(); toast.error('Could not issue medal.'); },
  });

  const revokeMutation = useMutation({
    mutationFn: (registrationId: string) =>
      api.delete(`/registrations/${registrationId}/distributions/MEDAL`),
    onSuccess: () => {
      sounds.undo();
      if (selected) lookupById(selected.id);
      refreshAll();
    },
    onError: () => { sounds.error(); toast.error('Could not revoke medal.'); },
  });

  const medalIssued = selected?.distributions?.some((d: { itemType: string }) => d.itemType === 'MEDAL');

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Award className="h-6 w-6 text-yellow-500 shrink-0" />
        <h1 className="text-2xl font-bold text-gray-900">Medal Distribution</h1>
        <select
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
          value={raceId}
          onChange={(e) => { setRaceId(e.target.value); setSelected(null); setMultiResults([]); }}
        >
          <option value="">Select a race…</option>
          {races.map((r) => <option key={r.id} value={r.id}>{r.name} — {r.distance} km</option>)}
        </select>
      </div>

      {!raceId ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-24 text-center">
          <Award className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500">Select a race to start</p>
        </div>
      ) : (
        <>
          <VolunteerStats raceId={raceId} itemType="MEDAL" refreshKey={statsKey} />

          {/* Undo strip */}
          {actions.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs text-gray-400 shrink-0">Recent:</span>
              {actions.map((a) => (
                <div key={a.id} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs text-gray-600 shrink-0">
                  <span className="max-w-[180px] truncate">{a.label}</span>
                  {a.undo && (
                    <button onClick={async () => { await a.undo?.(); sounds.undo(); removeAction(a.id); }} className="text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-0.5 ml-1">
                      <RotateCcw className="h-3 w-3" /> Undo
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_360px] gap-4 min-h-0 flex-1">

            {/* Col 1: participant list */}
            <div className="flex flex-col border border-gray-200 rounded-xl bg-white overflow-hidden">
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                  <input
                    className="w-full rounded-md border border-gray-200 pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="Filter list…"
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {filteredRegs.filter((r) => !r.distributions?.some((d: any) => d.itemType === 'MEDAL')).length} pending · {filteredRegs.length} total
                </p>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                {listLoading ? (
                  <div className="p-4 text-center text-sm text-gray-400">Loading…</div>
                ) : filteredRegs.map((r) => {
                  const issued = r.distributions?.some((d: any) => d.itemType === 'MEDAL');
                  return (
                    <button
                      key={r.id}
                      onClick={() => { setMultiResults([]); lookupById(r.id); }}
                      className={`w-full text-left px-3 py-2.5 transition-colors border-l-2 ${
                        selected?.id === r.id ? 'bg-yellow-50 border-yellow-400' : 'border-transparent hover:bg-gray-50'
                      } ${issued ? 'opacity-40' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {r.participant?.fullName ?? r.participant?.email ?? '—'}
                        </span>
                        {issued && <Award className="h-3.5 w-3.5 text-yellow-400 shrink-0 ml-auto" />}
                      </div>
                      <div className="pl-5 mt-0.5 flex items-center gap-2">
                        {r.bibNumber && <span className="text-xs font-mono text-blue-600">#{r.bibNumber}</span>}
                        <span className={`text-xs font-medium ${issued ? 'text-yellow-500' : 'text-gray-400'}`}>
                          {issued ? '🥇 issued' : 'not issued'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Col 2: search hero */}
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border-2 border-yellow-300 bg-white p-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Find Participant</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      ref={searchRef}
                      className="w-full rounded-lg border-2 border-gray-200 pl-12 pr-4 h-16 text-xl font-semibold focus:border-yellow-400 focus:outline-none"
                      placeholder="Name, email or bib #…"
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setMultiResults([]); }}
                      onKeyDown={(e) => e.key === 'Enter' && search.trim() && lookupMutation.mutate(search.trim())}
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={() => lookupMutation.mutate(search.trim())}
                    disabled={!search.trim() || lookupMutation.isPending}
                    className="h-16 px-6 rounded-lg bg-yellow-500 hover:bg-yellow-600 disabled:opacity-30 text-white text-lg font-bold transition-colors"
                  >
                    {lookupMutation.isPending ? '…' : '→'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 text-center">Press Enter to search</p>
              </div>

              {/* QR secondary */}
              <button
                onClick={() => setScanning((s) => !s)}
                className="flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 py-4 text-sm font-medium text-gray-500 hover:border-yellow-300 hover:text-yellow-600 hover:bg-yellow-50 transition-colors"
              >
                <QrCode className="h-5 w-5" />
                {scanning ? 'Cancel scan' : 'Or scan QR code'}
              </button>
              {scanning && (
                <QrScanner
                  onScan={(code) => {
                    setScanning(false);
                    setMultiResults([]);
                    try { const p = JSON.parse(code); lookupById(p.registrationId ?? code); }
                    catch { lookupById(code); }
                    setTimeout(() => searchRef.current?.focus(), 100);
                  }}
                  onClose={() => { setScanning(false); setTimeout(() => searchRef.current?.focus(), 100); }}
                />
              )}

              {/* Multiple results */}
              {multiResults.length > 1 && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
                  <p className="text-xs text-gray-500 font-medium">{multiResults.length} results — select one:</p>
                  {multiResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => lookupById(r.id)}
                      className="w-full text-left rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-yellow-50 hover:border-yellow-300 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-900">{r.participant?.fullName}</span>
                      <span className="ml-2 text-xs text-gray-400">{r.participant?.email}</span>
                      {r.bibNumber && <span className="ml-2 text-xs font-mono text-blue-600">#{r.bibNumber}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Col 3: action card */}
            {selected ? (
              <div className="flex flex-col rounded-xl border-2 border-gray-200 bg-white p-5 gap-4">

                {/* Participant info */}
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-lg font-bold text-gray-900 leading-tight">{selected.participant?.fullName}</div>
                    <Badge variant={selected.status === 'FINISHED' ? 'success' : 'info'} className="shrink-0">
                      {selected.status ?? '—'}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-400">{selected.participant?.email}</div>
                  {selected.bibNumber && (
                    <div className="text-sm font-mono font-bold text-blue-600">Bib #{selected.bibNumber}</div>
                  )}
                  {selected.participant?.country && (
                    <CountryFlag country={selected.participant.country} size={16} />
                  )}
                </div>

                {/* Medal action */}
                {medalIssued ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-4 text-yellow-700 font-semibold">
                      <Award className="h-5 w-5 shrink-0" />
                      Medal already issued ✓
                    </div>
                    <button
                      onClick={() => revokeMutation.mutate(selected.id)}
                      disabled={revokeMutation.isPending}
                      className="text-xs text-red-400 hover:text-red-600 hover:underline w-full text-center"
                    >
                      {revokeMutation.isPending ? 'Revoking…' : 'Revoke medal'}
                    </button>
                  </div>
                ) : (
                  <button
                    className="w-full h-16 rounded-xl bg-yellow-500 hover:bg-yellow-600 disabled:opacity-40 text-white font-black text-lg flex items-center justify-center gap-2 transition-colors"
                    onClick={() => distributeMutation.mutate(selected.id)}
                    disabled={distributeMutation.isPending}
                  >
                    <Award className="h-6 w-6" />
                    {distributeMutation.isPending ? 'Issuing…' : 'Issue Medal 🥇'}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-center p-8 text-gray-300">
                <Award className="h-10 w-10 mb-2" />
                <p className="text-sm">Search or scan to find a participant</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
