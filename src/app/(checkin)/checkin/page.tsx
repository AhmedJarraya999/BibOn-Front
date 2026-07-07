'use client';
import { Suspense, useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { QrCode, Hash, CheckCircle, X, AlertTriangle, Users, ChevronRight, RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { type Race, type Registration } from '@/types';
import { useToast } from '@/components/ui/toast';
import { sounds } from '@/lib/sounds';

const QrScanner = dynamic(() => import('@/components/checkin/qr-scanner').then((m) => m.QrScanner), { ssr: false });

type Flash = 'success' | 'duplicate' | 'error' | null;

interface CheckedRunner {
  id: string;
  name: string;
  bib: string;
  race: string;
  at: Date;
  duplicate?: boolean;
}

const C = {
  bg: '#f8f9fb',
  card: '#ffffff',
  border: '#e8eaed',
  text: '#111827',
  muted: '#6b7280',
  faint: '#9ca3af',
  orange: '#d96c00',
  orangeBg: '#fff7ed',
  orangeBorder: '#fed7aa',
  green: '#16a34a',
  greenBg: '#f0fdf4',
  greenBorder: '#bbf7d0',
  amber: '#d97706',
  amberBg: '#fffbeb',
  amberBorder: '#fde68a',
  red: '#dc2626',
};

const COUNTRY_ISO: Record<string, string> = {
  'Tunisie': 'tn', 'Tunisia': 'tn', 'France': 'fr',
  'Algérie': 'dz', 'Algeria': 'dz', 'Maroc': 'ma', 'Morocco': 'ma',
  'Egypte': 'eg', 'Egypt': 'eg', 'Allemagne': 'de', 'Germany': 'de',
  'Espagne': 'es', 'Spain': 'es', 'Italie': 'it', 'Italy': 'it',
  'Belgique': 'be', 'Belgium': 'be', 'Suisse': 'ch', 'Switzerland': 'ch',
  'Canada': 'ca', 'États-Unis': 'us', 'USA': 'us',
};

function CheckInInner() {
  const searchParams = useSearchParams();
  const [raceId, setRaceId] = useState(searchParams.get('raceId') ?? '');
  const [scanning, setScanning] = useState(false);
  const [bibInput, setBibInput] = useState('');
  const [flash, setFlash] = useState<Flash>(null);
  const [flashData, setFlashData] = useState<{ name: string; bib: string; race: string } | null>(null);
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

  const { data: allRegsData, isLoading: allRegsLoading } = useQuery({
    queryKey: ['checkin-all-regs', raceId],
    queryFn: () => api.get('/registrations', { params: { raceId, limit: 1000 } }).then((r) => r.data),
    enabled: !!raceId,
    refetchInterval: 15000,
  });
  const allRegs: Registration[] = allRegsData?.data ?? [];
  const checkedInRegs = allRegs.filter((r) => r.status === 'CHECKED_IN');
  const pct = allRegs.length > 0 ? Math.round((checkedInRegs.length / allRegs.length) * 100) : 0;

  const triggerFlash = (type: Flash, data?: { name: string; bib: string; race: string }) => {
    setFlash(type);
    setFlashData(data ?? null);
    setTimeout(() => { setFlash(null); setFlashData(null); }, 1800);
  };

  const performCheckIn = async (registrationId: string) => {
    try {
      const res = await api.get(`/registrations/${registrationId}`);
      const reg: Registration = res.data;
      const name = reg.participant?.fullName ?? reg.participant?.email ?? 'Inconnu';
      const bib = reg.bibNumber ?? '—';
      const race = reg.race?.name ?? '';

      if (reg.status === 'CHECKED_IN') {
        sounds.error();
        triggerFlash('duplicate', { name, bib, race });
        setRecentList((prev) => [
          { id: registrationId, name, bib, race, at: new Date(), duplicate: true },
          ...prev.filter((p) => p.id !== registrationId),
        ]);
        return;
      }

      await api.post(`/registrations/${registrationId}/check-in`);
      sounds.success();
      triggerFlash('success', { name, bib, race });
      setRecentList((prev) => [{ id: registrationId, name, bib, race, at: new Date() }, ...prev]);
      queryClient.invalidateQueries({ queryKey: ['checkin-all-regs', raceId] });
    } catch {
      sounds.error();
      triggerFlash('error');
      toast.error('Participant introuvable.');
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
      if (regs.length === 0) { sounds.error(); triggerFlash('error'); toast.error(`Dossard #${bib} introuvable.`); return; }
      await performCheckIn(regs[0].id);
    } catch {
      sounds.error();
      triggerFlash('error');
    }
  };

  const displayList = showAll
    ? checkedInRegs.map((r) => ({
        id: r.id,
        name: r.participant?.fullName ?? r.participant?.email ?? '—',
        bib: r.bibNumber ?? '—',
        race: r.race?.name ?? '',
        at: new Date((r as any).updatedAt ?? (r as any).createdAt ?? Date.now()),
        duplicate: false,
      }))
    : recentList;

  const selectedRace = races.find(r => r.id === raceId);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Flash overlay ── */}
      {flash && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
          background: flash === 'success' ? '#16a34a' : flash === 'duplicate' ? '#d97706' : '#dc2626',
        }}>
          {flash === 'success' && (
            <>
              <CheckCircle style={{ width: 80, height: 80, color: '#fff' }} strokeWidth={1.5} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0 }}>{flashData?.name}</p>
                {flashData?.bib !== '—' && <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 18, marginTop: 4 }}>Dossard #{flashData?.bib}</p>}
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 2 }}>{flashData?.race}</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 16, padding: '8px 24px' }}>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 17, margin: 0 }}>✓ Check-in confirmé</p>
              </div>
            </>
          )}
          {flash === 'duplicate' && (
            <>
              <AlertTriangle style={{ width: 80, height: 80, color: '#fff' }} strokeWidth={1.5} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0 }}>{flashData?.name}</p>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 18, marginTop: 4 }}>Dossard #{flashData?.bib}</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 16, padding: '8px 24px' }}>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 17, margin: 0 }}>⚠ Déjà checké</p>
              </div>
            </>
          )}
          {flash === 'error' && (
            <>
              <X style={{ width: 80, height: 80, color: '#fff' }} strokeWidth={1.5} />
              <p style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0 }}>Introuvable</p>
            </>
          )}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: C.card }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.orangeBg, border: `1px solid ${C.orangeBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QrCode style={{ width: 18, height: 18, color: C.orange }} />
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 14, color: C.text, margin: 0, lineHeight: 1 }}>Check-in</p>
            {selectedRace && <p style={{ fontSize: 12, color: C.muted, marginTop: 2, margin: 0 }}>{selectedRace.name}</p>}
          </div>
        </div>

        {raceId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="44" height="44">
              <circle cx="22" cy="22" r="17" fill="none" stroke={C.border} strokeWidth="3.5"/>
              <circle cx="22" cy="22" r="17" fill="none" stroke={C.green} strokeWidth="3.5"
                strokeDasharray={`${pct * 1.068} 106.8`} strokeLinecap="round" transform="rotate(-90 22 22)"/>
              <text x="22" y="26" textAnchor="middle" fontSize="10" fontWeight="800" fill={C.text}>{pct}%</text>
            </svg>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 16, fontWeight: 900, color: C.green, margin: 0 }}>{checkedInRegs.length}</p>
              <p style={{ fontSize: 11, color: C.faint, margin: 0 }}>/ {allRegs.length}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Race selector ── */}
      {!raceId ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: C.orangeBg, border: `1px solid ${C.orangeBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <QrCode style={{ width: 30, height: 30, color: C.orange }} />
            </div>
            <p style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: 0 }}>Sélectionner une course</p>
            <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Pour commencer le check-in</p>
          </div>
          <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {races.map((r) => (
              <button key={r.id} onClick={() => setRaceId(r.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderRadius: 14, border: `1px solid ${C.border}`, background: C.card,
                padding: '14px 18px', cursor: 'pointer', textAlign: 'left',
              }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{r.name}</p>
                  <p style={{ fontSize: 12, color: C.muted, marginTop: 2, margin: 0 }}>{(r as any).distance} km</p>
                </div>
                <ChevronRight style={{ width: 16, height: 16, color: C.faint }} />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }} className="lg:flex-row">

            {/* ── Left: Scan area ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>

              {/* QR scan button */}
              <button onClick={() => setScanning(true)} style={{
                width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 16, borderRadius: 16, border: `2px dashed ${C.orangeBorder}`, background: C.orangeBg,
                padding: '40px 0', cursor: 'pointer',
              }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: '#fff', border: `1px solid ${C.orangeBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <QrCode style={{ width: 30, height: 30, color: C.orange }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 17, fontWeight: 900, color: C.text, margin: 0 }}>Scanner le QR code</p>
                  <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Appuyez pour ouvrir la caméra</p>
                </div>
              </button>

              {/* Bib fallback */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Hash style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: C.faint }} />
                  <input
                    ref={bibRef}
                    inputMode="numeric"
                    placeholder="N° de dossard + Entrée…"
                    value={bibInput}
                    onChange={(e) => setBibInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleBibSubmit(); }}
                    autoComplete="off"
                    style={{
                      width: '100%', borderRadius: 12, border: `1px solid ${C.border}`, background: C.card,
                      paddingLeft: 44, paddingRight: 16, paddingTop: 14, paddingBottom: 14,
                      fontSize: 24, fontWeight: 900, color: C.text, outline: 'none',
                      letterSpacing: '0.1em', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <button onClick={handleBibSubmit} disabled={!bibInput.trim()} style={{
                  borderRadius: 12, background: C.orange, padding: '0 24px',
                  fontSize: 20, fontWeight: 900, color: '#fff', border: 'none', cursor: 'pointer',
                  opacity: bibInput.trim() ? 1 : 0.35,
                }}>
                  ✓
                </button>
              </div>

              <p style={{ fontSize: 11, color: C.faint, textAlign: 'center', margin: 0 }}>
                Scanner le QR en priorité · sinon saisir le numéro de dossard
              </p>

              <button onClick={() => { setRaceId(''); setRecentList([]); setBibInput(''); }}
                style={{ marginTop: 'auto', fontSize: 12, color: C.faint, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
                ← Changer de course
              </button>
            </div>

            {/* ── Right: list ── */}
            <div style={{ borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', background: C.card }} className="lg:w-96 lg:border-t-0 lg:border-l">
              <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users style={{ width: 15, height: 15, color: C.faint }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>
                    {showAll ? `Tous (${checkedInRegs.length})` : `Cette session (${recentList.length})`}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => queryClient.invalidateQueries({ queryKey: ['checkin-all-regs', raceId] })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.faint, display: 'flex' }}>
                    <RefreshCw style={{ width: 14, height: 14 }} />
                  </button>
                  <button onClick={() => setShowAll((s) => !s)}
                    style={{ fontSize: 12, fontWeight: 700, color: C.orange, background: 'none', border: 'none', cursor: 'pointer' }}>
                    {showAll ? 'Session' : 'Tous'}
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', maxHeight: '60vh' }} className="lg:max-h-none">
                {allRegsLoading && showAll ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${C.orange}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                ) : displayList.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 0', color: C.faint }}>
                    <CheckCircle style={{ width: 28, height: 28, marginBottom: 8 }} />
                    <p style={{ fontSize: 13, margin: 0 }}>Aucun check-in</p>
                  </div>
                ) : (
                  displayList.map((p, i) => (
                    <div key={`${p.id}-${i}`} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                      borderBottom: `1px solid ${C.border}`,
                      background: p.duplicate ? C.amberBg : i === 0 && !showAll ? C.greenBg : 'transparent',
                    }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14,
                        background: p.duplicate ? C.amberBg : C.greenBg,
                        color: p.duplicate ? C.amber : C.green,
                        border: `1px solid ${p.duplicate ? C.amberBorder : C.greenBorder}`,
                      }}>
                        {p.duplicate ? '!' : <CheckCircle style={{ width: 18, height: 18 }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: p.duplicate ? C.amber : C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </p>
                        <p style={{ fontSize: 11, color: C.faint, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.bib !== '—' && `#${p.bib} · `}{p.race} · {p.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                      </div>
                      {p.duplicate && (
                        <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: C.amber, background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 999, padding: '2px 8px' }}>
                          Déjà checké
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {scanning && (
        <QrScanner
          onScan={handleQrScan}
          onClose={() => { setScanning(false); setTimeout(() => bibRef.current?.focus(), 100); }}
        />
      )}
    </div>
  );
}

export default function CheckInPage() {
  return (
    <Suspense>
      <CheckInInner />
    </Suspense>
  );
}
