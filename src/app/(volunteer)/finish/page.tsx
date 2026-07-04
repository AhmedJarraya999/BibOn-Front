'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Timer, CheckCircle, X, Trophy, QrCode } from 'lucide-react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { type Registration, type Race } from '@/types';
import { useToast } from '@/components/ui/toast';
import { CountryFlag } from '@/components/ui/country-flag';
import { sounds } from '@/lib/sounds';
import { formatDateTime } from '@/lib/utils';

const QrScanner = dynamic(() => import('@/components/checkin/qr-scanner').then((m) => m.QrScanner), { ssr: false });

type Flash = 'success' | 'already' | 'error' | null;

function elapsed(startTime?: string, finishTime?: string): string {
  if (!startTime || !finishTime) return '—';
  const ms = new Date(finishTime).getTime() - new Date(startTime).getTime();
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0
    ? `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
    : `${m}m ${s.toString().padStart(2, '0')}s`;
}

export default function FinishPage() {
  const [raceId, setRaceId] = useState('');
  const [bibInput, setBibInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [flash, setFlash] = useState<Flash>(null);
  const [flashName, setFlashName] = useState('');
  const [flashTime, setFlashTime] = useState('');

  const bibRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: racesData } = useQuery({
    queryKey: ['races-finish'],
    queryFn: () => api.get('/races', { params: { limit: 100 } }).then((r) => r.data),
  });
  const races: Race[] = racesData?.data ?? [];

  const { data: finishersData, isLoading: finishersLoading } = useQuery({
    queryKey: ['finishers', raceId],
    queryFn: () =>
      api.get('/registrations', { params: { raceId, status: 'FINISHED', limit: 500 } }).then((r) => r.data),
    enabled: !!raceId,
    refetchInterval: 10000,
  });
  const finishers: Registration[] = (finishersData?.data ?? []).sort(
    (a: Registration, b: Registration) =>
      new Date(a.finishTime ?? 0).getTime() - new Date(b.finishTime ?? 0).getTime(),
  );

  useEffect(() => {
    if (raceId) setTimeout(() => bibRef.current?.focus(), 100);
  }, [raceId]);

  const triggerFlash = (type: Flash, name = '', time = '') => {
    setFlash(type);
    setFlashName(name);
    setFlashTime(time);
    setTimeout(() => { setFlash(null); bibRef.current?.focus(); }, 1200);
  };

  const recordFinish = async (registrationId: string) => {
    try {
      const regRes = await api.get(`/registrations/${registrationId}`);
      const reg: Registration = regRes.data;
      const name = reg.participant?.fullName ?? reg.participant?.email ?? 'Unknown';

      if (reg.status === 'FINISHED') {
        sounds.error();
        triggerFlash('already', name, reg.finishTime ? formatDateTime(reg.finishTime) : '');
        return;
      }

      await api.post(`/registrations/${registrationId}/finish`);
      queryClient.invalidateQueries({ queryKey: ['finishers', raceId] });
      sounds.success();
      triggerFlash('success', name);
    } catch {
      sounds.error();
      triggerFlash('error');
    }
  };

  const handleBibSubmit = async () => {
    const bib = bibInput.trim();
    if (!bib || !raceId) return;
    setBibInput('');
    try {
      const res = await api.get(`/races/${raceId}/registrations/by-bib/${bib}`);
      await recordFinish(res.data.id);
    } catch {
      sounds.error();
      triggerFlash('error');
      toast.error(`Bib #${bib} not found.`);
    }
  };

  const handleQrScan = (code: string) => {
    setScanning(false);
    try { const p = JSON.parse(code); recordFinish(p.registrationId ?? code); }
    catch { recordFinish(code); }
    setTimeout(() => bibRef.current?.focus(), 100);
  };

  return (
    <div className="flex flex-col gap-4 h-full relative">

      {/* Flash overlay */}
      {flash && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 ${
          flash === 'success' ? 'bg-blue-600' : flash === 'already' ? 'bg-amber-400' : 'bg-red-500'
        }`}>
          {flash === 'success' && <Trophy className="h-20 w-20 text-white" />}
          {flash === 'already' && <CheckCircle className="h-20 w-20 text-white" />}
          {flash === 'error' && <X className="h-20 w-20 text-white" />}
          <p className="text-3xl font-black text-white text-center px-8">
            {flash === 'success' && flashName}
            {flash === 'already' && 'Already finished!'}
            {flash === 'error' && 'Not found'}
          </p>
          {flash === 'already' && flashName && <p className="text-white text-lg">{flashName}</p>}
          {flash === 'already' && flashTime && <p className="text-white/80 text-base">{flashTime}</p>}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Timer className="h-6 w-6 text-blue-600 shrink-0" />
        <h1 className="text-2xl font-bold text-gray-900">Finish Line</h1>
        <select
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={raceId}
          onChange={(e) => { setRaceId(e.target.value); setBibInput(''); }}
        >
          <option value="">Select a race…</option>
          {races.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} — {r.distance} km · {formatDateTime(r.startTime)}
            </option>
          ))}
        </select>
      </div>

      {!raceId ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-24 text-center">
          <Timer className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500">Select a race to start recording finish times</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 flex-1 min-h-0">

          {/* Left: bib input + QR */}
          <div className="flex flex-col gap-4">

            {/* Counter */}
            <div className="rounded-xl bg-blue-600 text-white p-5 text-center">
              <p className="text-6xl font-black">{finishers.length}</p>
              <p className="text-sm font-medium mt-1 opacity-80">Finishers recorded</p>
            </div>

            {/* Bib input — hero */}
            <div className="rounded-xl border-2 border-blue-400 bg-white p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Record Finish — Enter Bib Number</p>
              <div className="flex gap-2">
                <input
                  ref={bibRef}
                  inputMode="numeric"
                  placeholder="Bib #"
                  value={bibInput}
                  onChange={(e) => setBibInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleBibSubmit(); }}
                  className="flex-1 rounded-lg border-2 border-gray-200 px-4 text-4xl font-black tracking-widest text-center focus:border-blue-400 focus:outline-none h-20"
                  autoComplete="off"
                  autoFocus
                />
                <button
                  onClick={handleBibSubmit}
                  disabled={!bibInput.trim()}
                  className="w-20 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white text-3xl font-black transition-colors"
                >
                  ✓
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center">Type bib number and press Enter or ✓</p>
            </div>

            {/* QR secondary */}
            <button
              onClick={() => setScanning(true)}
              className="flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 py-4 text-sm font-medium text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <QrCode className="h-5 w-5" />
              Or scan QR code
            </button>

            {scanning && (
              <QrScanner onScan={handleQrScan} onClose={() => { setScanning(false); setTimeout(() => bibRef.current?.focus(), 100); }} />
            )}
          </div>

          {/* Right: finishers leaderboard */}
          <div className="flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden min-h-0">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 shrink-0">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-semibold text-gray-700">Finishers ({finishers.length})</span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {finishersLoading ? (
                <div className="p-6 text-center text-sm text-gray-400">Loading…</div>
              ) : finishers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                  <Trophy className="h-8 w-8 mb-2" />
                  <p className="text-sm">No finishers yet</p>
                </div>
              ) : (
                finishers.map((f, index) => (
                  <div key={f.id} className={`flex items-center gap-3 px-4 py-3 ${index === 0 ? 'bg-yellow-50' : index === 1 ? 'bg-gray-50' : index === 2 ? 'bg-orange-50' : ''}`}>
                    <span className={`w-7 text-center text-sm font-black shrink-0 ${
                      index === 0 ? 'text-yellow-500 text-lg' :
                      index === 1 ? 'text-gray-400' :
                      index === 2 ? 'text-amber-600' : 'text-gray-300'
                    }`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-blue-600 shrink-0">#{f.bibNumber}</span>
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {f.participant?.fullName ?? '—'}
                        </span>
                      </div>
                      {f.participant?.country && (
                        <CountryFlag country={f.participant.country} size={13} showName={false} className="mt-0.5" />
                      )}
                    </div>
                    <span className="text-sm font-bold text-blue-700 shrink-0 font-mono">
                      {elapsed(f.startTime, f.finishTime)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
