'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QrCode, Utensils, CheckCircle, AlertTriangle, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { type Race } from '@/types';
import { useToast } from '@/components/ui/toast';
import { sounds } from '@/lib/sounds';
import { CountryFlag } from '@/components/ui/country-flag';

const QrScanner = dynamic(() => import('@/components/checkin/qr-scanner').then((m) => m.QrScanner), { ssr: false });

type Flash = 'success' | 'duplicate' | 'error' | null;

interface PassedRunner {
  id: string;
  name: string;
  bib: string;
  country?: string;
  at: Date;
  duplicate?: boolean;
}

export default function RavitoPage() {
  const [raceId, setRaceId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [bibInput, setBibInput] = useState('');
  const [flash, setFlash] = useState<Flash>(null);
  const [flashName, setFlashName] = useState('');
  const [passed, setPassed] = useState<PassedRunner[]>([]);

  const bibRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: racesData } = useQuery({
    queryKey: ['races-ravito'],
    queryFn: () => api.get('/races', { params: { limit: 100 } }).then((r) => r.data),
  });
  const races: Race[] = racesData?.data ?? [];

  const { data: allRegsData } = useQuery({
    queryKey: ['ravito-total', raceId],
    queryFn: () => api.get('/registrations', { params: { raceId, limit: 1 } }).then((r) => r.data),
    enabled: !!raceId,
  });
  const totalRegistered = allRegsData?.total ?? 0;

  useEffect(() => {
    if (raceId) setTimeout(() => bibRef.current?.focus(), 100);
  }, [raceId]);

  const triggerFlash = (type: Flash, name = '') => {
    setFlash(type);
    setFlashName(name);
    setTimeout(() => { setFlash(null); bibRef.current?.focus(); }, 1000);
  };

  const markPassed = useCallback(async (registrationId: string) => {
    try {
      const res = await api.get(`/registrations/${registrationId}`);
      const reg = res.data;
      const name = reg.participant?.fullName ?? reg.participant?.email ?? 'Unknown';
      const bib = reg.bibNumber ?? '—';
      const country = reg.participant?.country;

      const alreadyPassed = passed.some((p) => p.id === registrationId);
      if (alreadyPassed) {
        sounds.error();
        triggerFlash('duplicate', name);
        setPassed((prev) => [
          { id: registrationId, name, bib, country, at: new Date(), duplicate: true },
          ...prev.filter((p) => p.id !== registrationId),
        ]);
        return;
      }

      try {
        await api.post(`/registrations/${registrationId}/distributions`, { itemType: 'RAVITO' });
      } catch {}

      sounds.success();
      triggerFlash('success', name);
      setPassed((prev) => [{ id: registrationId, name, bib, country, at: new Date() }, ...prev]);
    } catch {
      sounds.error();
      triggerFlash('error');
      toast.error('Runner not found.');
    }
  }, [passed, toast]);

  const handleQrScan = (code: string) => {
    setScanning(false);
    try { const p = JSON.parse(code); markPassed(p.registrationId ?? code); }
    catch { markPassed(code); }
  };

  const handleBibSubmit = async () => {
    const bib = bibInput.trim();
    if (!bib || !raceId) return;
    setBibInput('');
    try {
      const res = await api.get('/registrations/lookup', { params: { raceId, search: bib } });
      if (res.data.length === 0) { sounds.error(); triggerFlash('error'); toast.error(`Bib #${bib} not found.`); return; }
      await markPassed(res.data[0].id);
    } catch { sounds.error(); triggerFlash('error'); }
  };

  const passedCount = passed.filter((p) => !p.duplicate).length;

  return (
    <div className="flex flex-col gap-4 h-full relative">

      {/* Flash overlay */}
      {flash && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 transition-opacity ${
          flash === 'success' ? 'bg-green-500' : flash === 'duplicate' ? 'bg-amber-400' : 'bg-red-500'
        }`}>
          {flash === 'success' && <CheckCircle className="h-20 w-20 text-white" />}
          {flash === 'duplicate' && <AlertTriangle className="h-20 w-20 text-white" />}
          {flash === 'error' && <X className="h-20 w-20 text-white" />}
          <p className="text-3xl font-black text-white text-center px-8">
            {flash === 'success' && flashName}
            {flash === 'duplicate' && `Already passed!`}
            {flash === 'error' && 'Not found'}
          </p>
          {flash === 'duplicate' && <p className="text-white text-lg">{flashName}</p>}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Utensils className="h-6 w-6 text-green-600 shrink-0" />
        <h1 className="text-2xl font-bold text-gray-900">Ravito Station</h1>
        <select
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          value={raceId}
          onChange={(e) => { setRaceId(e.target.value); setPassed([]); setBibInput(''); }}
        >
          <option value="">Select a race…</option>
          {races.map((r) => <option key={r.id} value={r.id}>{r.name} — {r.distance} km</option>)}
        </select>
      </div>

      {!raceId ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-24 text-center">
          <Utensils className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500">Select a race to start</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 flex-1 min-h-0">

          {/* Left: action area */}
          <div className="flex flex-col gap-4">

            {/* Counter */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-green-500 text-white p-5 text-center">
                <p className="text-5xl font-black">{passedCount}</p>
                <p className="text-sm font-medium mt-1 opacity-80">Passed this session</p>
              </div>
              <div className="rounded-xl bg-gray-100 p-5 text-center">
                <p className="text-5xl font-black text-gray-700">{totalRegistered}</p>
                <p className="text-sm font-medium mt-1 text-gray-500">Total registered</p>
              </div>
            </div>

            {/* Bib input — main action */}
            <div className="rounded-xl border-2 border-green-400 bg-white p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Enter Bib Number</p>
              <div className="flex gap-2">
                <input
                  ref={bibRef}
                  inputMode="numeric"
                  placeholder="Bib #"
                  value={bibInput}
                  onChange={(e) => setBibInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleBibSubmit(); }}
                  className="flex-1 rounded-lg border-2 border-gray-200 px-4 text-4xl font-black tracking-widest text-center focus:border-green-400 focus:outline-none h-20"
                  autoComplete="off"
                  autoFocus
                />
                <button
                  onClick={handleBibSubmit}
                  disabled={!bibInput.trim()}
                  className="w-20 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-30 text-white text-3xl font-black transition-colors"
                >
                  ✓
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center">Type bib number and press Enter or ✓</p>
            </div>

            {/* QR scan — secondary */}
            <button
              onClick={() => setScanning(true)}
              className="flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 py-4 text-sm font-medium text-gray-500 hover:border-green-300 hover:text-green-600 hover:bg-green-50 transition-colors"
            >
              <QrCode className="h-5 w-5" />
              Or scan QR code
            </button>

            {scanning && (
              <QrScanner onScan={handleQrScan} onClose={() => { setScanning(false); setTimeout(() => bibRef.current?.focus(), 100); }} />
            )}
          </div>

          {/* Right: recent runners */}
          <div className="flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden min-h-0">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
              <span className="text-sm font-semibold text-gray-700">Recently passed</span>
              {passed.length > 0 && (
                <button onClick={() => setPassed([])} className="text-xs text-gray-400 hover:text-red-500">Clear</button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {passed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                  <Utensils className="h-8 w-8 mb-2" />
                  <p className="text-sm">No runners yet</p>
                </div>
              ) : (
                passed.map((p, i) => (
                  <div key={`${p.id}-${i}`} className={`flex items-center gap-3 px-4 py-3 ${p.duplicate ? 'bg-amber-50' : i === 0 ? 'bg-green-50' : ''}`}>
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white font-black text-lg ${p.duplicate ? 'bg-amber-400' : 'bg-green-500'}`}>
                      {p.duplicate ? '!' : '✓'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold truncate ${p.duplicate ? 'text-amber-700' : 'text-gray-900'}`}>{p.name}</p>
                        {p.bib !== '—' && <span className="text-xs font-mono font-semibold text-blue-600 shrink-0">#{p.bib}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.country && <CountryFlag country={p.country} size={13} />}
                        <span className="text-xs text-gray-400">{p.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        {p.duplicate && <span className="text-xs text-amber-500 font-medium">already passed</span>}
                      </div>
                    </div>
                    <button onClick={() => setPassed((prev) => prev.filter((_, j) => j !== i))} className="text-gray-200 hover:text-gray-400 shrink-0">
                      <X className="h-4 w-4" />
                    </button>
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
