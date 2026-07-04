'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QrCode, Hash, CheckCircle, X, AlertTriangle, Users } from 'lucide-react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { CountryFlag } from '@/components/ui/country-flag';
import { type Race, type Registration } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { sounds } from '@/lib/sounds';

const QrScanner = dynamic(() => import('@/components/checkin/qr-scanner').then((m) => m.QrScanner), { ssr: false });

type Flash = 'success' | 'duplicate' | 'error' | null;

interface CheckedRunner {
  id: string;
  name: string;
  bib: string;
  at: Date;
  duplicate?: boolean;
}

export default function CheckInPage() {
  const [raceId, setRaceId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [bibInput, setBibInput] = useState('');
  const [flash, setFlash] = useState<Flash>(null);
  const [flashName, setFlashName] = useState('');
  const [recentList, setRecentList] = useState<CheckedRunner[]>([]);
  const [showAll, setShowAll] = useState(false);

  const bibRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (raceId) setTimeout(() => bibRef.current?.focus(), 100);
  }, [raceId]);

  const { data: racesData } = useQuery({
    queryKey: ['races-checkin'],
    queryFn: () => api.get('/races', { params: { limit: 100 } }).then((r) => r.data),
  });
  const races: Race[] = racesData?.data ?? [];

  // All registrations for this race (to show checked-in list)
  const { data: allRegsData, isLoading: allRegsLoading } = useQuery({
    queryKey: ['checkin-all-regs', raceId],
    queryFn: () => api.get('/registrations', { params: { raceId, limit: 1000 } }).then((r) => r.data),
    enabled: !!raceId,
    refetchInterval: 15000,
  });
  const allRegs: Registration[] = allRegsData?.data ?? [];
  const checkedInRegs = allRegs.filter((r) => r.status === 'CHECKED_IN');

  const triggerFlash = (type: Flash, name = '') => {
    setFlash(type);
    setFlashName(name);
    setTimeout(() => setFlash(null), 1200);
  };

  const performCheckIn = async (registrationId: string) => {
    try {
      const res = await api.get(`/registrations/${registrationId}`);
      const reg: Registration = res.data;
      const name = reg.participant?.fullName ?? reg.participant?.email ?? 'Unknown';
      const bib = reg.bibNumber ?? '—';

      if (reg.status === 'CHECKED_IN') {
        sounds.error();
        triggerFlash('duplicate', name);
        setRecentList((prev) => [
          { id: registrationId, name, bib, at: new Date(), duplicate: true },
          ...prev.filter((p) => p.id !== registrationId),
        ]);
        return;
      }

      await api.post(`/registrations/${registrationId}/check-in`);
      sounds.success();
      triggerFlash('success', name);
      setRecentList((prev) => [{ id: registrationId, name, bib, at: new Date(), country: reg.participant?.country } as any, ...prev]);
      queryClient.invalidateQueries({ queryKey: ['checkin-all-regs', raceId] });
    } catch {
      sounds.error();
      triggerFlash('error');
      toast.error('Registration not found.');
    }
  };

  const handleQrScan = (code: string) => {
    setScanning(false);
    try {
      const p = JSON.parse(code);
      performCheckIn(p.registrationId ?? code);
    } catch {
      performCheckIn(code);
    }
    setTimeout(() => bibRef.current?.focus(), 100);
  };

  const handleBibSubmit = async () => {
    const bib = bibInput.trim();
    if (!bib || !raceId) return;
    setBibInput('');
    try {
      const res = await api.get('/registrations/lookup', { params: { raceId, search: bib } });
      const regs: Registration[] = res.data;
      if (regs.length === 0) { sounds.error(); triggerFlash('error'); toast.error(`Bib #${bib} not found.`); return; }
      await performCheckIn(regs[0].id);
    } catch {
      sounds.error();
      triggerFlash('error');
    }
  };

  const flashConfig = {
    success:   { bg: 'bg-blue-600',  icon: <CheckCircle className="h-16 w-16 text-white" />,   label: (n: string) => n },
    duplicate: { bg: 'bg-amber-400', icon: <AlertTriangle className="h-16 w-16 text-white" />, label: (n: string) => `⚠ Already checked in — ${n}` },
    error:     { bg: 'bg-red-500',   icon: <X className="h-16 w-16 text-white" />,              label: () => 'Not found' },
  };

  const displayList = showAll ? checkedInRegs.map((r) => ({
    id: r.id,
    name: r.participant?.fullName ?? r.participant?.email ?? '—',
    bib: r.bibNumber ?? '—',
    at: new Date(r.updatedAt ?? r.createdAt ?? Date.now()),
  })) : recentList;

  return (
    <div className="flex flex-col gap-4 h-full relative">

      {/* Flash overlay */}
      {flash && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 ${flashConfig[flash].bg}`}>
          {flashConfig[flash].icon}
          <p className="text-2xl font-bold text-white text-center px-8">
            {flashConfig[flash].label(flashName)}
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <QrCode className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Check-in</h1>
        </div>
        <select
          className="h-9 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={raceId}
          onChange={(e) => { setRaceId(e.target.value); setRecentList([]); setBibInput(''); }}
        >
          <option value="">Select a race…</option>
          {races.map((r) => (
            <option key={r.id} value={r.id}>{r.name} — {r.distance} km</option>
          ))}
        </select>
        {raceId && (
          <span className="ml-auto rounded-full bg-blue-100 px-4 py-1.5 text-sm font-bold text-blue-700">
            {checkedInRegs.length} / {allRegs.length} checked in
          </span>
        )}
      </div>

      {!raceId ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-24 text-center">
          <QrCode className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500">Select a race to start</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 flex-1">

          {/* Left: scan area */}
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setScanning(true)}
              className="w-full flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 py-12 text-blue-600 hover:bg-blue-100 hover:border-blue-400 transition-colors"
            >
              <QrCode className="h-14 w-14" />
              <span className="text-lg font-bold">Scan Participant QR Code</span>
              <span className="text-sm text-blue-400">Tap to open camera</span>
            </button>

            {scanning && (
              <QrScanner
                onScan={handleQrScan}
                onClose={() => { setScanning(false); setTimeout(() => bibRef.current?.focus(), 100); }}
              />
            )}

            {/* Bib fallback */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <Input
                  ref={bibRef}
                  inputMode="numeric"
                  placeholder="Type bib number + Enter…"
                  value={bibInput}
                  onChange={(e) => setBibInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleBibSubmit(); }}
                  className="pl-10 text-xl font-bold tracking-widest h-14"
                  autoComplete="off"
                />
              </div>
              <Button
                onClick={handleBibSubmit}
                disabled={!bibInput.trim()}
                className="h-14 px-6 bg-blue-600 hover:bg-blue-700 text-white text-base font-bold"
              >
                ✓
              </Button>
            </div>
            <p className="text-xs text-gray-400 text-center -mt-2">Scan QR first · fallback: type bib # and press Enter</p>
          </div>

          {/* Right: checked-in list */}
          <div className="flex flex-col border border-gray-200 rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">
                  {showAll ? `All checked-in (${checkedInRegs.length})` : `This session (${recentList.length})`}
                </span>
              </div>
              <button
                onClick={() => setShowAll((s) => !s)}
                className="text-xs font-medium text-blue-500 hover:text-blue-700"
              >
                {showAll ? 'Show session' : 'Show all'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {allRegsLoading && showAll ? (
                <div className="p-6 text-center text-sm text-gray-400">Loading…</div>
              ) : displayList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                  <CheckCircle className="h-8 w-8 mb-2" />
                  <p className="text-sm">No check-ins yet</p>
                </div>
              ) : (
                displayList.map((p, i) => (
                  <div
                    key={`${p.id}-${i}`}
                    className={`flex items-center gap-3 px-4 py-3 ${(p as any).duplicate ? 'bg-amber-50' : i === 0 && !showAll ? 'bg-blue-50' : ''}`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white font-black ${(p as any).duplicate ? 'bg-amber-400' : 'bg-blue-500'}`}>
                      {(p as any).duplicate ? '!' : <CheckCircle className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${(p as any).duplicate ? 'text-amber-700' : 'text-gray-900'}`}>
                        {p.name}
                        {(p as any).duplicate && <span className="ml-1 text-xs font-normal">(already checked in)</span>}
                      </p>
                      <p className="text-xs text-gray-400">
                        <span className="flex items-center gap-1 flex-wrap">
                          {p.bib !== '—' && `Bib #${p.bib}`}
                          {(p as any).country && <><span>·</span><CountryFlag country={(p as any).country} size={14} /></>}
                          <span>· {p.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </span>
                      </p>
                    </div>
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
