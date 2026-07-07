'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Check, AlertTriangle, X, QrCode, Camera, ChevronDown, ChevronUp, Hash } from 'lucide-react';
import api from '@/lib/api';

interface Participant {
  id: string; fullName: string; email: string; phone?: string;
  gender: string; birthdate: string; club?: string; country?: string;
  cin?: string; emergencyContact?: string; emergencyPhone?: string;
}
interface Registration {
  id: string; bibNumber: string | null;
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED';
  lieuDeRetrait?: string; createdAt: string;
  participant: Participant; race: { id: string; name: string };
}

const C = {
  bg: '#f4f5f7', card: '#ffffff', border: '#e2e5ea', borderLight: '#edf0f4',
  text: '#0f1117', sub: '#5c6370', muted: '#9399a3',
  orange: '#d96c00', orangeLight: '#fff8f2', orangeBorder: '#fcd5a8',
  green: '#166534', greenLight: '#f0fdf4', greenBorder: '#86efac',
  red: '#991b1b', redLight: '#fef2f2', redBorder: '#fca5a5',
  amber: '#78350f', amberLight: '#fffbeb', amberBorder: '#fcd34d',
  blue: '#1e3a8a', blueLight: '#eff6ff', blueBorder: '#93c5fd',
  tableHead: '#f8f9fb',
};

function age(b: string) { return new Date().getFullYear() - new Date(b).getFullYear(); }

// ─── QR Scanner ──────────────────────────────────────────────────────────────
function QrScanner({ onResult, onClose }: { onResult: (t: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [err, setErr] = useState('');

  const scan = useCallback(() => {
    const v = videoRef.current;
    if (!v || v.readyState < 2) { rafRef.current = requestAnimationFrame(scan); return; }
    const BD = (window as any).BarcodeDetector;
    if (!BD) { setErr('BarcodeDetector non supporté.'); return; }
    const detector = new BD({ formats: ['qr_code'] });
    const loop = async () => {
      try { const c = await detector.detect(v); if (c.length) { onResult(c[0].rawValue); return; } } catch {}
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  }, [onResult]);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => { streamRef.current = s; if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); } rafRef.current = requestAnimationFrame(scan); })
      .catch(() => setErr('Accès caméra refusé.'));
    return () => { cancelAnimationFrame(rafRef.current); streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [scan]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 340, background: C.card, borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><QrCode size={15} color={C.orange} /><span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Scanner QR</span></div>
          <button onClick={onClose} style={{ height: 26, width: 26, borderRadius: 7, border: `1px solid ${C.border}`, background: C.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}><X size={12} /></button>
        </div>
        <div style={{ background: '#000', aspectRatio: '1', position: 'relative', overflow: 'hidden' }}>
          <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ width: 180, height: 180, position: 'relative' }}>
              {[{t:0,l:0,bt:'none',bb:'none',br:'none'},{t:0,r:0,bl:'none',bb:'none',br:'none'},{b:0,l:0,bt:'none',br:'none'},{b:0,r:0,bt:'none',bl:'none'}].map((s,i)=>(
                <div key={i} style={{ position:'absolute', width:24, height:24, ...Object.fromEntries(Object.entries(s).map(([k,v])=>[k===null?k:k,v])),
                  borderTop: (s as any).bt !== 'none' ? undefined : `3px solid ${C.orange}`,
                  borderBottom: (s as any).bb !== 'none' ? undefined : `3px solid ${C.orange}`,
                  borderLeft: (s as any).bl !== 'none' ? undefined : `3px solid ${C.orange}`,
                  borderRight: (s as any).br !== 'none' ? undefined : `3px solid ${C.orange}`,
                }} />
              ))}
            </div>
          </div>
        </div>
        <p style={{ padding: '12px 16px', fontSize: 12, color: C.muted, textAlign: 'center' }}>{err || 'Pointez la caméra vers le QR code'}</p>
      </div>
    </div>
  );
}

// ─── Alert Form ───────────────────────────────────────────────────────────────
function AlertForm({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const [name, setName] = useState(''); const [phone, setPhone] = useState('');
  const [proof, setProof] = useState(''); const [tempBib, setTempBib] = useState('');
  const [done, setDone] = useState(false);
  const mutation = useMutation({
    mutationFn: () => api.post('/reclamations', { name, phone: phone||undefined, proofDescription: proof||undefined, temporaryBib: tempBib||undefined, eventId, note: 'Point de distribution' }),
    onSuccess: () => setDone(true),
  });
  const inp: React.CSSProperties = { width: '100%', borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.bg, padding: '9px 12px', fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, color: C.sub, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }}>
      <div style={{ width: '100%', maxWidth: 420, background: C.card, borderRadius: 18, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ height: 32, width: 32, borderRadius: 9, background: C.amberLight, border: `1px solid ${C.amberBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={14} color="#d97706" />
            </div>
            <div><p style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1 }}>Participant introuvable</p><p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Signaler à l'organisateur</p></div>
          </div>
          <button onClick={onClose} style={{ height: 26, width: 26, borderRadius: 7, background: C.bg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.muted }}><X size={12} /></button>
        </div>
        {done ? (
          <div style={{ padding: '32px 18px', textAlign: 'center' }}>
            <div style={{ height: 48, width: 48, borderRadius: 14, background: C.greenLight, border: `1px solid ${C.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><Check size={22} color={C.green} /></div>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Signalement envoyé</p>
            <button onClick={onClose} style={{ marginTop: 16, width: '100%', borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.bg, padding: '10px 0', fontSize: 13, fontWeight: 600, color: C.sub, cursor: 'pointer' }}>Fermer</button>
          </div>
        ) : (
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><label style={lbl}>Nom *</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Nom complet" style={inp}/></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div><label style={lbl}>Téléphone</label><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+216…" style={inp}/></div>
              <div><label style={lbl}>Dossard temp.</label><input value={tempBib} onChange={e=>setTempBib(e.target.value)} placeholder="T-001" style={inp}/></div>
            </div>
            <div><label style={lbl}>Preuve</label><input value={proof} onChange={e=>setProof(e.target.value)} placeholder="Email, reçu…" style={inp}/></div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={onClose} style={{ flex:1, borderRadius:9, border:`1.5px solid ${C.border}`, background:'transparent', padding:'10px 0', fontSize:13, fontWeight:600, color:C.sub, cursor:'pointer' }}>Annuler</button>
              <button onClick={()=>mutation.mutate()} disabled={mutation.isPending||!name.trim()} style={{ flex:1, borderRadius:9, border:'none', background:C.orange, padding:'10px 0', fontSize:13, fontWeight:700, color:'white', cursor:'pointer', opacity:(mutation.isPending||!name.trim())?0.5:1 }}>{mutation.isPending?'…':'Signaler'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Table Row ────────────────────────────────────────────────────────────────
function TableRow({ reg, cols }: { reg: Registration; cols: string[] }) {
  const [bib, setBib] = useState(reg.bibNumber ?? '');
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: { bibNumber?: string; paymentStatus?: string }) => api.patch(`/registrations/${reg.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['distribute-regs'] }); setOpen(false); },
  });

  const hasBib = !!reg.bibNumber;
  const isPaid = reg.paymentStatus === 'PAID';
  const isDone = hasBib && isPaid;
  const isNominatif = hasBib && !isDone;

  const statusStyle = isDone
    ? { background: C.greenLight, color: C.green, border: `1px solid ${C.greenBorder}` }
    : !isPaid ? { background: C.amberLight, color: C.amber, border: `1px solid ${C.amberBorder}` }
    : isNominatif ? { background: C.blueLight, color: C.blue, border: `1px solid ${C.blueBorder}` }
    : { background: C.bg, color: C.sub, border: `1px solid ${C.border}` };

  const statusLabel = isDone ? '✓ Remis' : !isPaid ? 'Impayé' : isNominatif ? 'Nominatif' : 'Sans dossard';

  const rowBg = isDone ? '#fafffe' : open ? C.orangeLight : C.card;
  const borderLeft = isDone ? `3px solid ${C.green}` : !isPaid ? `3px solid #f59e0b` : isNominatif ? `3px solid #60a5fa` : `3px solid transparent`;

  const cell: React.CSSProperties = { padding: '0 14px', fontSize: 13, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 };
  const sub: React.CSSProperties = { fontSize: 11, color: C.muted };

  const colMap: Record<string, React.ReactNode> = {
    dossard: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 36, width: 36, borderRadius: 10, fontWeight: 900, fontSize: 13,
        background: isDone ? C.greenLight : isNominatif ? C.blueLight : C.bg,
        color: isDone ? C.green : isNominatif ? C.blue : C.muted,
        border: `1.5px solid ${isDone ? C.greenBorder : isNominatif ? C.blueBorder : C.border}` }}>
        {isDone ? <Check size={16}/> : hasBib ? reg.bibNumber : <Hash size={14}/>}
      </div>
    ),
    nom: <div><p style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{reg.participant.fullName}</p><p style={sub}>{reg.participant.email}</p></div>,
    course: <span style={{ fontSize: 12, fontWeight: 600, color: C.sub }}>{reg.race.name}</span>,
    sexe: <div><p style={{ fontSize: 13, fontWeight: 600 }}>{reg.participant.gender === 'M' ? 'Homme' : 'Femme'}</p><p style={sub}>{age(reg.participant.birthdate)} ans</p></div>,
    telephone: <span>{reg.participant.phone ?? <span style={{ color: C.muted }}>—</span>}</span>,
    cin: <span>{reg.participant.cin ?? <span style={{ color: C.muted }}>—</span>}</span>,
    pays: <span>{reg.participant.country ?? <span style={{ color: C.muted }}>—</span>}</span>,
    lieu: <span style={{ color: reg.lieuDeRetrait ? C.orange : C.muted, fontWeight: reg.lieuDeRetrait ? 600 : 400 }}>{reg.lieuDeRetrait ?? '—'}</span>,
    club: <span>{reg.participant.club ?? <span style={{ color: C.muted }}>—</span>}</span>,
    statut: <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 9px', whiteSpace: 'nowrap', ...statusStyle }}>{statusLabel}</span>,
  };

  return (
    <>
      <tr style={{ background: rowBg, borderLeft, transition: 'background 0.1s' }}>
        {cols.map(col => (
          <td key={col} style={{ ...cell, borderBottom: open ? 'none' : `1px solid ${C.borderLight}`, verticalAlign: 'middle', height: 58 }}>
            {colMap[col]}
          </td>
        ))}
        {/* Action toggle cell */}
        <td style={{ padding: '0 12px', borderBottom: open ? 'none' : `1px solid ${C.borderLight}`, verticalAlign: 'middle', width: 48 }}>
          {!isDone && (
            <button onClick={() => setOpen(v => !v)}
              style={{ height: 32, width: 32, borderRadius: 8, border: `1.5px solid ${open ? C.orangeBorder : C.border}`, background: open ? C.orangeLight : C.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: open ? C.orange : C.muted, transition: 'all 0.12s' }}>
              {open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>
          )}
        </td>
      </tr>

      {/* Expanded action row */}
      {open && !isDone && (
        <tr style={{ background: C.orangeLight }}>
          <td colSpan={cols.length + 1} style={{ padding: '0 16px 14px', borderBottom: `1px solid ${C.borderLight}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {!isPaid && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderRadius: 9, background: C.amberLight, border: `1px solid ${C.amberBorder}`, padding: '10px 13px', marginRight: 8 }}>
                  <div><p style={{ fontSize: 12, fontWeight: 700, color: C.amber }}>Paiement sur place requis</p></div>
                  <button onClick={() => mutation.mutate({ paymentStatus: 'PAID' })} disabled={mutation.isPending}
                    style={{ borderRadius: 7, background: '#d97706', border: 'none', padding: '7px 12px', fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer', opacity: mutation.isPending ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                    Marquer payé
                  </button>
                </div>
              )}
              {isNominatif ? (
                <button onClick={() => mutation.mutate({ paymentStatus: 'PAID' })} disabled={mutation.isPending || !isPaid}
                  style={{ borderRadius: 9, background: C.orange, border: 'none', padding: '10px 18px', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', opacity: (!isPaid || mutation.isPending) ? 0.4 : 1 }}>
                  {mutation.isPending ? '…' : `✓ Confirmer remise du #${reg.bibNumber}`}
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="number" inputMode="numeric" value={bib} onChange={e => setBib(e.target.value)}
                    placeholder="Numéro de dossard"
                    style={{ borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.card, padding: '8px 12px', fontSize: 18, fontWeight: 900, color: C.text, outline: 'none', width: 180, boxSizing: 'border-box' }} />
                  <button onClick={() => mutation.mutate({ bibNumber: bib.trim() })}
                    disabled={mutation.isPending || !bib.trim() || !isPaid}
                    style={{ borderRadius: 9, background: C.orange, border: 'none', padding: '10px 18px', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', opacity: (mutation.isPending || !bib.trim() || !isPaid) ? 0.4 : 1 }}>
                    {mutation.isPending ? '…' : 'Attribuer'}
                  </button>
                  {!isPaid && <span style={{ fontSize: 11, color: '#b45309' }}>Paiement requis d'abord</span>}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DistributePage() {
  const { token } = useParams<{ token: string }>();
  const [search, setSearch] = useState('');
  const [raceFilter, setRaceFilter] = useState('all');
  const [filter, setFilter] = useState<'no-bib' | 'pending' | 'all'>('no-bib');
  const [alertOpen, setAlertOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const { data: point, isLoading: pointLoading, isError } = useQuery({
    queryKey: ['dist-point', token],
    queryFn: () => api.get(`/distribution-points/token/${token}`).then(r => r.data),
    retry: false,
  });

  const { data: racesData } = useQuery({
    queryKey: ['races', point?.event?.id],
    queryFn: () => api.get('/races', { params: { eventId: point.event.id, limit: 100 } }).then(r => r.data),
    enabled: !!point?.event?.id,
  });
  const races: { id: string; name: string }[] = racesData?.data ?? racesData ?? [];

  const raceQueries = useQueries({
    queries: races.map(race => ({
      queryKey: ['distribute-regs', race.id],
      queryFn: () => api.get('/registrations', { params: { raceId: race.id, limit: 500 } }).then(r => r.data),
      enabled: races.length > 0,
      refetchInterval: 20_000,
    })),
  });

  const registrations: Registration[] = raceQueries
    .flatMap(q => { const d = q.data as any; return d?.data ?? d ?? []; })
    .filter((r: Registration) => r.race != null && r.participant != null);

  const handleQrResult = useCallback((text: string) => {
    setScanOpen(false); setSearch(text); setFilter('all'); setRaceFilter('all');
  }, []);

  const filtered = registrations.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !search || r.participant.fullName.toLowerCase().includes(q) || r.participant.email.toLowerCase().includes(q) || (r.participant.phone ?? '').includes(q) || (r.participant.cin ?? '').toLowerCase().includes(q) || (r.bibNumber ?? '').includes(q);
    const matchRace = raceFilter === 'all' || r.race.id === raceFilter;
    const matchStatus = filter === 'all' ? true : filter === 'no-bib' ? !r.bibNumber : r.paymentStatus === 'PENDING';
    return matchSearch && matchRace && matchStatus;
  });

  const noBibCount = registrations.filter(r => !r.bibNumber).length;
  const pendingCount = registrations.filter(r => r.paymentStatus === 'PENDING').length;
  const doneCount = registrations.filter(r => r.bibNumber && r.paymentStatus === 'PAID').length;
  const nominatifCount = registrations.filter(r => r.bibNumber && r.paymentStatus !== 'PAID').length;
  const isLoading = pointLoading || (races.length > 0 && raceQueries.some(q => q.isLoading));

  const COLS = ['dossard', 'nom', 'course', 'sexe', 'telephone', 'cin', 'pays', 'lieu', 'club', 'statut'];
  const COL_LABELS: Record<string, string> = {
    dossard: '#', nom: 'Participant', course: 'Course', sexe: 'Sexe / Âge',
    telephone: 'Téléphone', cin: 'CIN', pays: 'Pays', lieu: 'Lieu de retrait', club: 'Club', statut: 'Statut',
  };

  const stats = [
    { label: 'Sans dossard', value: noBibCount, color: C.orange, bg: C.orangeLight, border: C.orangeBorder },
    { label: 'Impayés', value: pendingCount, color: C.red, bg: C.redLight, border: C.redBorder },
    { label: 'Nominatifs', value: nominatifCount, color: C.blue, bg: C.blueLight, border: C.blueBorder },
    { label: 'Complétés', value: doneCount, color: C.green, bg: C.greenLight, border: C.greenBorder },
  ];

  const tabs: { key: 'no-bib' | 'pending' | 'all'; label: string; count: number }[] = [
    { key: 'no-bib', label: 'Sans dossard', count: noBibCount },
    { key: 'pending', label: 'Impayés', count: pendingCount },
    { key: 'all', label: 'Tous', count: registrations.length },
  ];

  if (pointLoading) return <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ height:28,width:28,borderRadius:'50%',border:`2.5px solid ${C.orange}`,borderTopColor:'transparent',animation:'spin 0.7s linear infinite' }}/></div>;
  if (isError || !point) return <div style={{ minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'0 24px' }}><div><p style={{ fontSize:36,marginBottom:12 }}>🔗</p><p style={{ fontSize:15,fontWeight:700,color:C.text }}>Lien invalide ou expiré</p><p style={{ fontSize:13,color:C.muted,marginTop:6 }}>Contactez l'organisateur.</p></div></div>;

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box;margin:0;padding:0}input[type=number]::-webkit-inner-spin-button{opacity:0}tr:hover>td{background:rgba(0,0,0,0.012)}`}</style>
      <div style={{ minHeight:'100vh', background:C.bg, fontFamily:'system-ui,-apple-system,sans-serif', color:C.text }}>

        {/* ── Header ── */}
        <div style={{ position:'sticky', top:0, zIndex:40, background:'rgba(244,245,247,0.96)', backdropFilter:'blur(12px)', borderBottom:`1px solid ${C.border}`, padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <p style={{ fontSize:15,fontWeight:800,color:C.text,lineHeight:1 }}>{point.name}</p>
            <p style={{ fontSize:12,color:C.muted,marginTop:3 }}>{point.event.name}</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:10,fontWeight:800,color:C.orange,textTransform:'uppercase',letterSpacing:'0.08em' }}>Distribution</p>
              <p style={{ fontSize:11,color:C.muted,marginTop:2 }}>{doneCount}/{registrations.length} remis</p>
            </div>
            <svg width="38" height="38">
              <circle cx="19" cy="19" r="15" fill="none" stroke={C.border} strokeWidth="3"/>
              <circle cx="19" cy="19" r="15" fill="none" stroke={C.orange} strokeWidth="3"
                strokeDasharray={`${registrations.length>0?(doneCount/registrations.length)*94:0} 94`}
                strokeLinecap="round" transform="rotate(-90 19 19)"/>
              <text x="19" y="23" textAnchor="middle" fontSize="9" fontWeight="800" fill={C.text}>{registrations.length>0?Math.round(doneCount/registrations.length*100):0}%</text>
            </svg>
          </div>
        </div>

        <div style={{ padding:'20px 24px 48px' }}>

          {/* ── Stats ── */}
          <div style={{ display:'flex', gap:8, marginBottom:18 }}>
            {stats.map(s=>(
              <div key={s.label} style={{ borderRadius:10, background:C.card, border:`1.5px solid ${C.border}`, padding:'10px 16px', display:'flex', alignItems:'center', gap:10, boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize:22, fontWeight:900, color:s.color, lineHeight:1 }}>{s.value}</span>
                <span style={{ fontSize:11, fontWeight:700, color:C.sub, whiteSpace:'nowrap' }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* ── Toolbar ── */}
          <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center', flexWrap:'wrap' }}>
            {races.length > 1 && (
              <select value={raceFilter} onChange={e=>setRaceFilter(e.target.value)}
                style={{ borderRadius:10,border:`1.5px solid ${C.border}`,background:C.card,padding:'9px 12px',fontSize:13,fontWeight:600,color:C.text,outline:'none',cursor:'pointer',boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                <option value="all">Toutes les courses ({registrations.length})</option>
                {races.map(r=><option key={r.id} value={r.id}>{r.name} ({registrations.filter(rr=>rr.race.id===r.id).length})</option>)}
              </select>
            )}

            <div style={{ position:'relative', flex:1, minWidth:200 }}>
              <Search size={14} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:C.muted,pointerEvents:'none' }}/>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Nom, email, téléphone, CIN, dossard…"
                style={{ width:'100%',borderRadius:10,border:`1.5px solid ${C.border}`,background:C.card,paddingLeft:36,paddingRight:search?32:12,paddingTop:9,paddingBottom:9,fontSize:13,color:C.text,outline:'none',boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}/>
              {search&&<button onClick={()=>setSearch('')} style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:C.muted }}><X size={13}/></button>}
            </div>

            <button onClick={()=>setScanOpen(true)}
              style={{ borderRadius:10,border:`1.5px solid ${C.border}`,background:C.card,padding:'9px 14px',display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:13,fontWeight:700,color:C.sub,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',whiteSpace:'nowrap' }}>
              <Camera size={14}/>Scanner QR
            </button>

            <div style={{ display:'flex',gap:0,background:C.card,border:`1.5px solid ${C.border}`,borderRadius:10,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              {tabs.map((tab,i)=>(
                <button key={tab.key} onClick={()=>setFilter(tab.key)}
                  style={{ padding:'9px 14px',fontSize:12,fontWeight:700,border:'none',borderLeft:i>0?`1px solid ${C.border}`:'none',cursor:'pointer',transition:'all 0.12s',background:filter===tab.key?C.orange:'transparent',color:filter===tab.key?'white':C.sub,whiteSpace:'nowrap' }}>
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            <button onClick={()=>setAlertOpen(true)}
              style={{ borderRadius:10,border:`1.5px solid ${C.amberBorder}`,background:C.amberLight,padding:'9px 14px',display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:13,fontWeight:700,color:C.amber,whiteSpace:'nowrap' }}>
              <AlertTriangle size={14}/>Introuvable
            </button>
          </div>

          {/* ── Table ── */}
          <div style={{ borderRadius:14,border:`1.5px solid ${C.border}`,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.05)',background:C.card }}>
            {isLoading ? (
              <div style={{ display:'flex',justifyContent:'center',padding:'48px 0' }}>
                <div style={{ height:28,width:28,borderRadius:'50%',border:`2.5px solid ${C.orange}`,borderTopColor:'transparent',animation:'spin 0.7s linear infinite' }}/>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding:'48px 0',textAlign:'center' }}>
                <p style={{ fontSize:13,color:C.muted }}>Aucun participant trouvé</p>
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'auto' }}>
                  <thead>
                    <tr style={{ background:C.tableHead, borderBottom:`1.5px solid ${C.border}` }}>
                      {COLS.map(col=>(
                        <th key={col} style={{ padding:'0 14px',height:40,textAlign:'left',fontSize:10,fontWeight:800,color:C.muted,textTransform:'uppercase',letterSpacing:'0.07em',whiteSpace:'nowrap' }}>
                          {COL_LABELS[col]}
                        </th>
                      ))}
                      <th style={{ width:48 }}/>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(reg=><TableRow key={reg.id} reg={reg} cols={COLS}/>)}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p style={{ marginTop:10,fontSize:11,color:C.muted }}>{filtered.length} participant{filtered.length!==1?'s':''}</p>
        </div>
      </div>

      {scanOpen && <QrScanner onResult={handleQrResult} onClose={()=>setScanOpen(false)}/>}
      {alertOpen && point?.event?.id && <AlertForm eventId={point.event.id} onClose={()=>setAlertOpen(false)}/>}
    </>
  );
}
