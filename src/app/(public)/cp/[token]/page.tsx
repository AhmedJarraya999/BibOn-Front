'use client';
import { Suspense, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QrCode, Hash, CheckCircle, X, AlertTriangle, Users, AlertOctagon } from 'lucide-react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { sounds } from '@/lib/sounds';

const QrScanner = dynamic(() => import('@/components/checkin/qr-scanner').then((m) => m.QrScanner), { ssr: false });

type Flash = 'success' | 'duplicate' | 'error' | 'dnf' | null;
type Tab = 'scan' | 'dnf';

const C = {
  bg: '#f8f9fb', card: '#ffffff', border: '#e8eaed',
  text: '#111827', muted: '#6b7280', faint: '#9ca3af',
  orange: '#d96c00', orangeBg: '#fff7ed', orangeBorder: '#fed7aa',
  green: '#16a34a', greenBg: '#f0fdf4', greenBorder: '#bbf7d0',
  amber: '#d97706', amberBg: '#fffbeb', amberBorder: '#fde68a',
  red: '#dc2626', redBg: '#fef2f2', redBorder: '#fecaca',
};

const DNF_REASONS = [
  { key: 'Blessure', label: '🤕 Blessure', desc: 'Entorse, fracture, coupure...' },
  { key: 'Épuisement', label: '😮‍💨 Épuisement', desc: 'Crampes, malaise, hypoglycémie...' },
  { key: 'Évacuation médicale', label: '🚑 Évacuation médicale', desc: 'Nécessite une évacuation' },
  { key: 'Abandon volontaire', label: '🏳️ Abandon volontaire', desc: 'Le participant abandonne' },
];

interface ScannedRunner {
  id: string;
  name: string;
  bib: string;
  at: Date;
  duplicate?: boolean;
}

function CheckpointScanInner() {
  const { token } = useParams<{ token: string }>();
  const [tab, setTab] = useState<Tab>('scan');
  const [scanning, setScanning] = useState(false);
  const [bibInput, setBibInput] = useState('');
  const [flash, setFlash] = useState<Flash>(null);
  const [flashData, setFlashData] = useState<{ name: string; bib: string } | null>(null);
  const [recentList, setRecentList] = useState<ScannedRunner[]>([]);

  // DNF state
  const [dnfBib, setDnfBib] = useState('');
  const [dnfRunner, setDnfRunner] = useState<{ id: string; name: string; bib: string } | null>(null);
  const [dnfReason, setDnfReason] = useState('');
  const [dnfLoading, setDnfLoading] = useState(false);
  const [dnfDone, setDnfDone] = useState(false);

  const bibRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: cp, isLoading: cpLoading } = useQuery({
    queryKey: ['cp-token', token],
    queryFn: () => api.get(`/checkpoints/token/${token}`).then(r => r.data),
    enabled: !!token,
  });

  const triggerFlash = (type: Flash, data?: { name: string; bib: string }) => {
    setFlash(type);
    setFlashData(data ?? null);
    setTimeout(() => { setFlash(null); setFlashData(null); }, 1800);
  };

  const performScan = async (registrationId: string) => {
    try {
      await api.post(`/checkpoints/token/${token}/scan`, { registrationId });
      const regRes = await api.get(`/registrations/${registrationId}`);
      const reg = regRes.data;
      const name = reg.participant?.fullName ?? reg.participant?.email ?? 'Inconnu';
      const bib = reg.bibNumber ?? '—';
      sounds.success();
      triggerFlash('success', { name, bib });
      setRecentList(prev => [{ id: registrationId, name, bib, at: new Date() }, ...prev]);
      queryClient.invalidateQueries({ queryKey: ['cp-token', token] });
    } catch (err: any) {
      if (err?.response?.status === 409) {
        sounds.error();
        triggerFlash('duplicate');
        setRecentList(prev => [{ id: registrationId, name: '—', bib: '—', at: new Date(), duplicate: true }, ...prev]);
      } else {
        sounds.error();
        triggerFlash('error');
        toast.error('Participant introuvable.');
      }
    }
  };

  const handleQrScan = (code: string) => {
    setScanning(false);
    try {
      const p = JSON.parse(code);
      performScan(p.registrationId ?? code);
    } catch {
      performScan(code);
    }
    setTimeout(() => bibRef.current?.focus(), 100);
  };

  const handleBibSubmit = async () => {
    const bib = bibInput.trim();
    if (!bib || !cp) return;
    setBibInput('');
    try {
      const res = await api.get('/registrations/lookup', { params: { raceId: cp.raceId, search: bib } });
      const regs = res.data;
      if (regs.length === 0) { sounds.error(); triggerFlash('error'); toast.error(`Dossard #${bib} introuvable.`); return; }
      await performScan(regs[0].id);
    } catch {
      sounds.error();
      triggerFlash('error');
    }
  };

  const lookupDnfRunner = async () => {
    if (!dnfBib.trim() || !cp) return;
    try {
      const res = await api.get('/registrations/lookup', { params: { raceId: cp.raceId, search: dnfBib.trim() } });
      const regs = res.data;
      if (regs.length === 0) { toast.error(`Dossard #${dnfBib} introuvable.`); return; }
      const reg = regs[0];
      setDnfRunner({ id: reg.id, name: reg.participant?.fullName ?? reg.participant?.email ?? 'Inconnu', bib: reg.bibNumber ?? dnfBib });
    } catch {
      toast.error('Erreur de recherche.');
    }
  };

  const confirmDnf = async () => {
    if (!dnfRunner || !dnfReason) return;
    setDnfLoading(true);
    try {
      await api.patch(`/registrations/${dnfRunner.id}`, { status: 'DNF', dnfReason });
      sounds.error();
      setDnfDone(true);
      setTimeout(() => { setDnfDone(false); setDnfRunner(null); setDnfBib(''); setDnfReason(''); }, 3000);
    } catch {
      toast.error('Erreur lors de l\'enregistrement.');
    } finally {
      setDnfLoading(false);
    }
  };

  const TYPE_LABELS: Record<string, string> = {
    TIMING: '⏱ Timing', EAU: '💧 Eau', RAVITO: '🥤 Ravitaillement', TIMING_RAVITO: '⏱🥤 Timing + Ravito',
  };

  if (cpLoading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${C.orange}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (!cp) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <X style={{ width: 40, height: 40, color: '#dc2626' }} />
      <p style={{ color: C.muted, fontSize: 15 }}>Checkpoint introuvable</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>

      {/* Flash overlay */}
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
              </div>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 16, padding: '8px 24px' }}>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 17, margin: 0 }}>✓ Passage enregistré</p>
              </div>
            </>
          )}
          {flash === 'duplicate' && (
            <>
              <AlertTriangle style={{ width: 80, height: 80, color: '#fff' }} strokeWidth={1.5} />
              <p style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0 }}>Déjà scanné ici</p>
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

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: C.card }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.orangeBg, border: `1px solid ${C.orangeBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QrCode style={{ width: 18, height: 18, color: C.orange }} />
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 15, color: C.text, margin: 0 }}>{cp.name}</p>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{TYPE_LABELS[cp.type] ?? cp.type} · {cp.race?.name}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 18, fontWeight: 900, color: C.green, margin: 0 }}>{cp._count?.scans ?? 0}</p>
          <p style={{ fontSize: 11, color: C.faint, margin: 0 }}>passages</p>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, background: C.card }}>
        {([['scan', '📡 Scanner'], ['dnf', '🏳️ Abandon']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
            background: 'none', color: tab === t ? C.orange : C.muted,
            borderBottom: tab === t ? `2px solid ${C.orange}` : '2px solid transparent',
          }}>{label}</button>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, gap: 16 }}>

        {tab === 'dnf' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {dnfDone ? (
              <div style={{ borderRadius: 16, background: C.redBg, border: `1px solid ${C.redBorder}`, padding: 24, textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 900, color: C.red, margin: 0 }}>🏳️ Abandon enregistré</p>
                <p style={{ fontSize: 14, color: C.muted, marginTop: 8 }}>{dnfRunner?.name} — #{dnfRunner?.bib}</p>
              </div>
            ) : !dnfRunner ? (
              <>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Rechercher le participant</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Hash style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: C.faint }} />
                    <input
                      inputMode="numeric"
                      placeholder="N° de dossard…"
                      value={dnfBib}
                      onChange={e => setDnfBib(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') lookupDnfRunner(); }}
                      style={{ width: '100%', borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, paddingLeft: 44, paddingRight: 16, paddingTop: 14, paddingBottom: 14, fontSize: 22, fontWeight: 900, color: C.text, outline: 'none', letterSpacing: '0.1em', boxSizing: 'border-box' }}
                    />
                  </div>
                  <button onClick={lookupDnfRunner} disabled={!dnfBib.trim()} style={{ borderRadius: 12, background: C.red, padding: '0 24px', fontSize: 18, fontWeight: 900, color: '#fff', border: 'none', cursor: 'pointer', opacity: dnfBib.trim() ? 1 : 0.35 }}>→</button>
                </div>
              </>
            ) : (
              <>
                {/* Runner card */}
                <div style={{ borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: C.redBg, border: `1px solid ${C.redBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: C.red }}>
                    #{dnfRunner.bib}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15, color: C.text, margin: 0 }}>{dnfRunner.name}</p>
                    <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Dossard #{dnfRunner.bib}</p>
                  </div>
                  <button onClick={() => setDnfRunner(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: C.faint }}>
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </div>

                {/* Reason selector */}
                <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Raison de l'abandon</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {DNF_REASONS.map(r => (
                    <button key={r.key} onClick={() => setDnfReason(r.key)} style={{
                      borderRadius: 12, border: `2px solid ${dnfReason === r.key ? C.red : C.border}`,
                      background: dnfReason === r.key ? C.redBg : C.card,
                      padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
                    }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: dnfReason === r.key ? C.red : C.text, margin: 0 }}>{r.label}</p>
                      <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{r.desc}</p>
                    </button>
                  ))}
                </div>

                <button onClick={confirmDnf} disabled={!dnfReason || dnfLoading} style={{
                  borderRadius: 12, background: C.red, padding: '16px 0', fontSize: 15, fontWeight: 900, color: '#fff',
                  border: 'none', cursor: 'pointer', opacity: dnfReason && !dnfLoading ? 1 : 0.35, width: '100%',
                }}>
                  {dnfLoading ? 'Enregistrement...' : '🏳️ Confirmer l\'abandon'}
                </button>
              </>
            )}
          </div>
        )}

        {tab === 'scan' && <>

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
          }}>✓</button>
        </div>

        <p style={{ fontSize: 11, color: C.faint, textAlign: 'center', margin: 0 }}>
          Scanner le QR en priorité · sinon saisir le numéro de dossard
        </p>

        {/* Recent scans */}
        {recentList.length > 0 && (
          <div style={{ borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users style={{ width: 14, height: 14, color: C.faint }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>Cette session ({recentList.length})</span>
            </div>
            {recentList.map((p, i) => (
              <div key={`${p.id}-${i}`} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                borderBottom: i < recentList.length - 1 ? `1px solid ${C.border}` : 'none',
                background: p.duplicate ? C.amberBg : i === 0 ? C.greenBg : 'transparent',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: p.duplicate ? C.amberBg : C.greenBg,
                  color: p.duplicate ? C.amber : C.green,
                  border: `1px solid ${p.duplicate ? C.amberBorder : C.greenBorder}`,
                  fontWeight: 900, fontSize: 13,
                }}>
                  {p.duplicate ? '!' : <CheckCircle style={{ width: 16, height: 16 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: p.duplicate ? C.amber : C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </p>
                  <p style={{ fontSize: 11, color: C.faint, margin: 0 }}>
                    {p.bib !== '—' && `#${p.bib} · `}{p.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
                {p.duplicate && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.amber, background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 999, padding: '2px 8px', flexShrink: 0 }}>
                    Déjà scanné
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        </>}
      </div>

      {scanning && (
        <QrScanner
          onScan={handleQrScan}
          onClose={() => { setScanning(false); setTimeout(() => bibRef.current?.focus(), 100); }}
        />
      )}
    </div>
  );
}

export default function CheckpointScanPage() {
  return (
    <Suspense>
      <CheckpointScanInner />
    </Suspense>
  );
}
