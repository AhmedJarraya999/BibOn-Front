'use client';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useState } from 'react';
import { Radio, ChevronLeft, Search, AlertTriangle, ExternalLink, Users } from 'lucide-react';
import api from '@/lib/api';
import { Logo } from '@/components/ui/logo';

const POLL = 15_000;

const C = {
  bg: '#f8f9fb', card: '#ffffff', border: '#e8eaed',
  text: '#111827', muted: '#6b7280', faint: '#9ca3af',
  orange: '#d96c00', orangeBg: '#fff7ed', orangeBorder: '#fed7aa',
  green: '#16a34a', greenBg: '#f0fdf4', greenBorder: '#bbf7d0',
  blue: '#2563eb', blueBg: '#eff6ff',
  amber: '#d97706', amberBg: '#fffbeb',
  red: '#dc2626', redBg: '#fef2f2', redBorder: '#fecaca',
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  REGISTERED:   { label: 'Inscrit',     color: C.muted },
  CHECKED_IN:   { label: 'Checké',      color: C.green },
  FINISHED:     { label: 'Terminé',     color: C.orange },
  DNF:          { label: 'Abandon',     color: C.red },
  DISQUALIFIED: { label: 'Disqualifié', color: C.red },
};

const DNF_COLOR: Record<string, string> = {
  'Évacuation médicale': C.red,
  'Blessure': '#ea580c',
  'Épuisement': C.amber,
  'Abandon volontaire': C.muted,
};

export default function RaceDayPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedRace, setSelectedRace] = useState<string | null>(null);

  const { data: eventData } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data),
  });

  const { data: racesData } = useQuery({
    queryKey: ['races', id],
    queryFn: () => api.get('/races', { params: { eventId: id, limit: 100 } }).then(r => r.data),
    refetchInterval: POLL,
  });
  const races = racesData?.data ?? racesData ?? [];

  const regQueries = useQueries({
    queries: races.map((race: any) => ({
      queryKey: ['regs-live', race.id],
      queryFn: () => api.get('/registrations', { params: { raceId: race.id, limit: 1000 } }).then(r => r.data),
      refetchInterval: POLL,
    })),
  });

  const cpQueries = useQueries({
    queries: races.map((race: any) => ({
      queryKey: ['checkpoints-live', race.id],
      queryFn: () => api.get('/checkpoints', { params: { raceId: race.id } }).then(r => r.data),
      refetchInterval: POLL,
    })),
  });

  const allRegs = regQueries.flatMap(q => { const d = q.data as any; return d?.data ?? d ?? []; });

  const raceStats = races.map((race: any, i: number) => {
    const regs: any[] = (() => { const d = regQueries[i]?.data as any; return d?.data ?? d ?? []; })();
    const cps: any[] = (cpQueries[i]?.data as any) ?? [];
    return {
      race,
      total: regs.length,
      checkedIn: regs.filter((r: any) => r.status === 'CHECKED_IN').length,
      finished: regs.filter((r: any) => r.status === 'FINISHED').length,
      dnf: regs.filter((r: any) => r.status === 'DNF').length,
      dnfList: regs.filter((r: any) => r.status === 'DNF'),
      checkpoints: [...cps].sort((a: any, b: any) => a.order - b.order),
    };
  });

  type RaceStat = typeof raceStats[number];

  const totalStats = {
    total: raceStats.reduce((s: number, r: RaceStat) => s + r.total, 0),
    checkedIn: raceStats.reduce((s: number, r: RaceStat) => s + r.checkedIn, 0),
    finished: raceStats.reduce((s: number, r: RaceStat) => s + r.finished, 0),
    dnf: raceStats.reduce((s: number, r: RaceStat) => s + r.dnf, 0),
    medical: allRegs.filter((r: any) => r.dnfReason === 'Évacuation médicale').length,
  };

  const medicalAlerts = allRegs.filter((r: any) => r.dnfReason === 'Évacuation médicale');

  const filtered = allRegs.filter((r: any) => {
    if (selectedRace && r.raceId !== selectedRace) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return r.bibNumber?.toLowerCase().includes(q) || r.participant?.fullName?.toLowerCase().includes(q);
  });

  const statCards = [
    { label: 'Inscrits',    value: totalStats.total,    color: C.text },
    { label: 'Checkés',     value: totalStats.checkedIn, color: C.blue },
    { label: 'Finishers',   value: totalStats.finished,  color: C.orange },
    { label: 'Abandons',    value: totalStats.dnf,       color: C.amber },
    { label: 'Évacuations', value: totalStats.medical,   color: C.red },
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, sans-serif', color: C.text }}>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: C.card, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Logo size="sm" variant="light" />
          <div style={{ width: 1, height: 20, background: C.border }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: `1px solid ${C.greenBorder}`, borderRadius: 999, padding: '4px 12px' }}>
            <Radio style={{ width: 12, height: 12, color: C.green }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Race Day Live</span>
          </div>
          <span style={{ fontSize: 14, color: C.muted }}>{eventData?.name}</span>
        </div>
        <button onClick={() => router.push(`/events/${id}`)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.faint, background: 'none', border: 'none', cursor: 'pointer' }}>
          <ChevronLeft style={{ width: 16, height: 16 }} /> Tableau de bord
        </button>
      </div>

      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Medical alerts */}
        {medicalAlerts.length > 0 && (
          <div style={{ borderRadius: 16, border: `2px solid ${C.redBorder}`, background: C.redBg, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <AlertTriangle style={{ width: 18, height: 18, color: C.red }} />
              <span style={{ fontSize: 13, fontWeight: 900, color: C.red }}>
                {medicalAlerts.length} ÉVACUATION{medicalAlerts.length > 1 ? 'S' : ''} MÉDICALE{medicalAlerts.length > 1 ? 'S' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {medicalAlerts.map((r: any) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: `1px solid ${C.redBorder}`, borderRadius: 12, padding: '10px 16px' }}>
                  <span style={{ fontSize: 16, fontWeight: 900, color: C.red }}>#{r.bibNumber ?? '—'}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: C.text, margin: 0 }}>{r.participant?.fullName ?? '—'}</p>
                    <p style={{ fontSize: 12, color: C.red, margin: 0 }}>
                      {r.race?.name}
                      {r.participant?.emergencyContact && ` · 🆘 ${r.participant.emergencyContact} — ${r.participant.emergencyPhone}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overall stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {statCards.map(s => (
            <div key={s.label} style={{ borderRadius: 16, border: `1px solid ${C.border}`, background: C.card, padding: '16px 20px' }}>
              <p style={{ fontSize: 30, fontWeight: 900, color: s.color, margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 12, color: C.muted, marginTop: 4, margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Per-race cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {raceStats.map((rs: RaceStat) => {
            const { race, total, checkedIn, finished, dnf, dnfList, checkpoints } = rs;
            const pct = total > 0 ? Math.round((finished / total) * 100) : 0;
            const checkinPct = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
            return (
              <div key={race.id} style={{ borderRadius: 16, border: `1px solid ${C.border}`, background: C.card, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Race header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontWeight: 900, fontSize: 15, color: C.text, margin: 0 }}>{race.name}</p>
                    <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{race.distance} km · {race.type}</p>
                  </div>
                  <button onClick={() => router.push(`/events/${id}/races/${race.id}/live`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.faint, background: 'none', border: 'none', cursor: 'pointer' }}>
                    <ExternalLink style={{ width: 13, height: 13 }} /> Détail
                  </button>
                </div>

                {/* Stat pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { v: total,    label: 'inscrits',  bg: '#f3f4f6', color: C.muted },
                    { v: checkedIn, label: 'checkés',  bg: C.blueBg,  color: C.blue },
                    { v: finished,  label: 'finishers', bg: C.orangeBg, color: C.orange },
                    { v: dnf,       label: 'abandons',  bg: dnf > 0 ? C.redBg : '#f9fafb', color: dnf > 0 ? C.red : C.faint },
                  ].map(s => (
                    <span key={s.label} style={{ borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700, background: s.bg, color: s.color }}>
                      {s.v} {s.label}
                    </span>
                  ))}
                </div>

                {/* Progress bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Check-in', pct: checkinPct, color: C.blue },
                    { label: 'Finishers', pct, color: C.orange },
                  ].map(b => (
                    <div key={b.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.faint, marginBottom: 4 }}>
                        <span>{b.label}</span><span>{b.pct}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 999, background: C.border, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 999, background: b.color, width: `${b.pct}%`, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Checkpoint counts */}
                {checkpoints.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
                    {checkpoints.map((cp: any) => (
                      <div key={cp.id} style={{ flexShrink: 0, borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, padding: '8px 12px', textAlign: 'center', minWidth: 56 }}>
                        <p style={{ fontSize: 15, fontWeight: 900, color: C.text, margin: 0 }}>{cp._count?.scans ?? 0}</p>
                        <p style={{ fontSize: 10, color: C.faint, margin: 0, maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cp.name}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* DNF list */}
                {dnfList.length > 0 && (
                  <div style={{ borderRadius: 12, border: `1px solid ${C.redBorder}`, background: C.redBg, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: C.red, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Abandons</p>
                    {dnfList.map((r: any) => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 900, color: C.muted }}>#{r.bibNumber ?? '—'}</span>
                        <span style={{ fontSize: 12, color: C.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.participant?.fullName ?? '—'}</span>
                        {r.dnfReason && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: DNF_COLOR[r.dnfReason] ?? C.muted, background: `${DNF_COLOR[r.dnfReason] ?? C.muted}18`, borderRadius: 999, padding: '2px 8px', flexShrink: 0 }}>
                            {r.dnfReason === 'Évacuation médicale' && '🚑 '}{r.dnfReason}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Runner table */}
        <div style={{ borderRadius: 16, border: `1px solid ${C.border}`, background: C.card, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users style={{ width: 16, height: 16, color: C.faint }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Tous les coureurs</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: C.faint }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Dossard ou nom…"
                  style={{ borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontSize: 13, color: C.text, outline: 'none', width: 200 }} />
              </div>
              <select value={selectedRace ?? ''} onChange={e => setSelectedRace(e.target.value || null)}
                style={{ borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, padding: '8px 12px', fontSize: 13, color: C.text, outline: 'none' }}>
                <option value="">Toutes les courses</option>
                {races.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['#', 'Coureur', 'Course', 'Statut', 'Abandon'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '48px 0', textAlign: 'center', color: C.faint, fontSize: 13 }}>Aucun coureur trouvé</td></tr>
              )}
              {filtered.map((reg: any) => {
                const st = STATUS_META[reg.status] ?? STATUS_META.REGISTERED;
                const isMedical = reg.dnfReason === 'Évacuation médicale';
                return (
                  <tr key={reg.id} style={{ borderBottom: `1px solid ${C.border}`, background: isMedical ? C.redBg : 'transparent' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: C.orangeBg, color: C.orange, fontWeight: 900, fontSize: 13, minWidth: 36, padding: '2px 8px' }}>
                        {reg.bibNumber ?? '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <p style={{ fontWeight: 600, color: C.text, margin: 0 }}>{reg.participant?.fullName ?? '—'}</p>
                      <p style={{ fontSize: 11, color: C.faint, margin: 0 }}>{reg.participant?.email ?? ''}</p>
                    </td>
                    <td style={{ padding: '10px 16px', color: C.muted }}>{reg.race?.name ?? '—'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700, color: st.color, background: `${st.color}18` }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {reg.dnfReason
                        ? <span style={{ fontSize: 12, fontWeight: 700, color: DNF_COLOR[reg.dnfReason] ?? C.muted }}>{isMedical && '🚑 '}{reg.dnfReason}</span>
                        : <span style={{ color: C.border }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
