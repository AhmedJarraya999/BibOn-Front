'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Trophy, Clock, Flag, CheckCircle, XCircle, AlertCircle, CreditCard,
  QrCode, X, User, HeartPulse, Phone, Edit2, Save, BarChart2,
  TrendingUp, Zap, Target, Route, Gamepad2, Hash, Check,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '@/lib/api';
import { type Registration, type Participant } from '@/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { formatDateTime } from '@/lib/utils';
import { CountryFlag } from '@/components/ui/country-flag';

const GpxMap = dynamic(
  () => import('@/components/races/gpx-map').then((m) => m.GpxMap),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading map…</div> },
);

/* ─── helpers ─── */
const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  REGISTERED: 'info', CHECKED_IN: 'success', DNS: 'warning', DNF: 'danger',
  FINISHED: 'success', DISQUALIFIED: 'danger',
};
const statusIcon: Record<string, React.ReactNode> = {
  REGISTERED: <Clock className="h-4 w-4" />, CHECKED_IN: <CheckCircle className="h-4 w-4" />,
  DNS: <AlertCircle className="h-4 w-4" />, DNF: <XCircle className="h-4 w-4" />,
  FINISHED: <Trophy className="h-4 w-4" />, DISQUALIFIED: <XCircle className="h-4 w-4" />,
};
const paymentVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  PAID: 'success', PENDING: 'warning', FAILED: 'danger',
};
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COUNTRIES = ['Tunisie','Algérie','Maroc','Libye','Égypte','France','Italie','Allemagne','Espagne','Belgique','Suisse','Canada','Autre'];

function msToTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}h ${m.toString().padStart(2, '0')}m ${sec.toString().padStart(2, '0')}s`
    : `${m}m ${sec.toString().padStart(2, '0')}s`;
}

function elapsedMs(startTime?: string, finishTime?: string) {
  if (!startTime || !finishTime) return null;
  return new Date(finishTime).getTime() - new Date(startTime).getTime();
}

function pacePerKm(ms: number, km: number) {
  if (!km) return '—';
  const secPerKm = Math.floor(ms / 1000 / km);
  const m = Math.floor(secPerKm / 60);
  const s = secPerKm % 60;
  return `${m}:${s.toString().padStart(2, '0')} /km`;
}

/* ─── QR modal ─── */
function QRModal({ registration, onClose }: { registration: Registration; onClose: () => void }) {
  const qrData = JSON.stringify({
    registrationId: registration.id,
    bibNumber: registration.bibNumber,
    participant: registration.participant?.fullName,
    race: registration.race?.name,
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Your Race Pass</p>
          {(registration.race as any)?.event?.name && <p className="text-xs text-blue-600 font-medium mt-0.5">{(registration.race as any).event.name}</p>}
          <h2 className="mt-1 text-xl font-bold text-gray-900">{registration.race?.name}</h2>
          <p className="text-sm text-gray-500">{registration.participant?.fullName}</p>
        </div>
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-white">
          <div><p className="text-xs font-semibold opacity-70">BIB</p><p className="text-2xl font-black leading-none">{registration.bibNumber ?? '—'}</p></div>
        </div>
        <div className="flex justify-center rounded-xl border border-gray-100 bg-gray-50 p-4">
          <QRCodeSVG value={qrData} size={180} level="M" />
        </div>
        <p className="mt-4 text-xs text-gray-400">Show this QR code at bib pickup and check-in</p>
        <div className="mt-4 flex justify-center">
          <Badge variant={paymentVariant[registration.paymentStatus ?? 'PENDING'] ?? 'warning'}>
            {registration.paymentStatus === 'PAID' ? '✓ Payment confirmed' : '⏳ Payment pending'}
          </Badge>
        </div>
      </div>
    </div>
  );
}

/* ─── registration card ─── */
function RegistrationCard({ r, onQr, onMap, past }: { r: Registration; onQr: () => void; onMap: () => void; past?: boolean }) {
  const ms = elapsedMs(r.startTime, r.finishTime);
  const hasRoute = !!(r.race as any)?.gpxUrl;
  return (
    <div className={`rounded-xl border overflow-hidden hover:shadow-md transition-shadow ${past ? 'opacity-75 border-gray-200' : 'border-gray-200'}`}>
      <div className="flex items-stretch">
        <div className={`flex w-20 shrink-0 flex-col items-center justify-center py-5 text-white ${past ? 'bg-gray-400' : 'bg-blue-600'}`}>
          <p className="text-xs font-semibold uppercase opacity-70">Bib</p>
          <p className="text-2xl font-black leading-tight">{r.bibNumber ?? '—'}</p>
        </div>
        <div className="flex flex-1 items-center justify-between gap-4 px-5 py-4">
          <div>
            {(r.race as any)?.event?.name && <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-0.5">{(r.race as any).event.name}</p>}
            <p className="font-semibold text-gray-900">{r.race?.name ?? 'Race'}</p>
            <p className="mt-0.5 text-sm text-gray-500">
              {r.race?.distance ? `${r.race.distance} km` : ''}
              {r.race?.startTime ? ` · ${formatDateTime(r.race.startTime)}` : ''}
            </p>
            {ms && <p className="mt-1 text-sm font-bold text-green-600">🏁 {msToTime(ms)}</p>}
            <div className="mt-2 flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5 text-gray-400" />
              <Badge variant={paymentVariant[r.paymentStatus ?? 'PENDING'] ?? 'warning'}>{r.paymentStatus ?? 'PENDING'}</Badge>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">{statusIcon[r.status]}</span>
              <Badge variant={statusVariant[r.status] ?? 'default'}>{r.status.replace('_', ' ')}</Badge>
            </div>
            <div className="flex gap-1.5">
              {hasRoute && (
                <button onClick={onMap} className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors">
                  <Route className="h-3.5 w-3.5" /> Route
                </button>
              )}
              <button onClick={onQr} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 transition-colors">
                <QrCode className="h-3.5 w-3.5" /> QR
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Field wrapper ─── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      {children}
    </div>
  );
}

/* ─── Stats tab ─── */
function StatsTab({ registrations, participantId }: { registrations: Registration[]; participantId: string }) {
  const finished = registrations.filter((r) => r.status === 'FINISHED' && r.startTime && r.finishTime);

  const totalDistanceKm = finished.reduce((acc, r) => acc + (r.race?.distance ?? 0), 0);
  const times = finished.map((r) => ({ ms: elapsedMs(r.startTime, r.finishTime)!, km: r.race?.distance ?? 0, r }))
    .filter((x) => x.ms > 0);
  const bestTime = times.length ? times.reduce((a, b) => a.ms < b.ms ? a : b) : null;
  const worstTime = times.length ? times.reduce((a, b) => a.ms > b.ms ? a : b) : null;
  const avgMs = times.length ? times.reduce((a, b) => a + b.ms, 0) / times.length : 0;
  const dnfCount = registrations.filter((r) => r.status === 'DNF').length;
  const finishRate = registrations.filter((r) => ['FINISHED', 'DNF', 'DISQUALIFIED'].includes(r.status)).length > 0
    ? Math.round(finished.length / registrations.filter((r) => ['FINISHED', 'DNF', 'DISQUALIFIED'].includes(r.status)).length * 100)
    : 0;

  // Per race: fetch leaderboards for finished races
  const finishedRaceIds = [...new Set(finished.map((r) => r.raceId))];

  return (
    <div className="space-y-6">

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Flag className="h-5 w-5 text-blue-500" />} value={registrations.length} label="Total races" color="blue" />
        <StatCard icon={<Trophy className="h-5 w-5 text-green-500" />} value={finished.length} label="Finishes" color="green" />
        <StatCard icon={<Zap className="h-5 w-5 text-purple-500" />} value={`${totalDistanceKm.toFixed(0)} km`} label="Total distance" color="purple" />
        <StatCard icon={<Target className="h-5 w-5 text-orange-500" />} value={`${finishRate}%`} label="Finish rate" color="orange" />
      </div>

      {finished.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
          <BarChart2 className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No finished races yet</p>
          <p className="text-sm text-gray-400 mt-1">Stats will appear once you cross your first finish line</p>
        </div>
      ) : (
        <>
          {/* Personal records */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Personal Records</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {bestTime && (
                <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
                  <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">🏆 Best Time</p>
                  <p className="text-2xl font-black text-green-700">{msToTime(bestTime.ms)}</p>
                  <p className="text-xs text-green-600 mt-1">{bestTime.r.race?.name}</p>
                  <p className="text-xs text-green-500">{bestTime.km} km · {pacePerKm(bestTime.ms, bestTime.km)}</p>
                </div>
              )}
              {avgMs > 0 && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-center">
                  <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">📊 Average Time</p>
                  <p className="text-2xl font-black text-blue-700">{msToTime(Math.round(avgMs))}</p>
                  <p className="text-xs text-blue-500 mt-1">across {finished.length} race{finished.length > 1 ? 's' : ''}</p>
                </div>
              )}
              {worstTime && finished.length > 1 && (
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-center">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">🕐 Slowest</p>
                  <p className="text-2xl font-black text-gray-600">{msToTime(worstTime.ms)}</p>
                  <p className="text-xs text-gray-500 mt-1">{worstTime.r.race?.name}</p>
                  <p className="text-xs text-gray-400">{worstTime.km} km · {pacePerKm(worstTime.ms, worstTime.km)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Race by race breakdown + ranking */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Race History & Rankings</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {finished
                .slice()
                .sort((a, b) => new Date(b.race?.startTime ?? 0).getTime() - new Date(a.race?.startTime ?? 0).getTime())
                .map((r) => (
                  <RaceResultRow key={r.id} r={r} participantId={participantId} />
                ))}
            </div>
          </div>

          {/* Progress over time */}
          {times.length > 1 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Progress over time
              </h3>
              <div className="space-y-2">
                {times
                  .slice()
                  .sort((a, b) => new Date(a.r.race?.startTime ?? 0).getTime() - new Date(b.r.race?.startTime ?? 0).getTime())
                  .map((t, i, arr) => {
                    const prev = arr[i - 1];
                    const delta = prev ? t.ms - prev.ms : null;
                    const improved = delta !== null && delta < 0;
                    return (
                      <div key={t.r.id} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{t.r.race?.name}</p>
                          <p className="text-xs text-gray-400">{t.r.race?.distance} km · {t.r.race?.startTime ? new Date(t.r.race.startTime).toLocaleDateString() : ''}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-gray-900">{msToTime(t.ms)}</p>
                          {delta !== null && (
                            <p className={`text-xs font-semibold ${improved ? 'text-green-500' : 'text-red-400'}`}>
                              {improved ? '▲ ' : '▼ '}{msToTime(Math.abs(delta))}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Other stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">DNF count</p>
              <p className="text-3xl font-black text-gray-700 mt-1">{dnfCount}</p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Races registered</p>
              <p className="text-3xl font-black text-gray-700 mt-1">{registrations.filter((r) => r.status === 'REGISTERED').length}</p>
              <p className="text-xs text-gray-400 mt-0.5">upcoming</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: string | number; label: string; color: string }) {
  const bg: Record<string, string> = { blue: 'bg-blue-50 border-blue-200', green: 'bg-green-50 border-green-200', purple: 'bg-purple-50 border-purple-200', orange: 'bg-orange-50 border-orange-200' };
  const text: Record<string, string> = { blue: 'text-blue-700', green: 'text-green-700', purple: 'text-purple-700', orange: 'text-orange-700' };
  return (
    <div className={`rounded-xl border p-4 ${bg[color]}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p></div>
      <p className={`text-2xl font-black ${text[color]}`}>{value}</p>
    </div>
  );
}

function RaceResultRow({ r, participantId }: { r: Registration; participantId: string }) {
  const ms = elapsedMs(r.startTime, r.finishTime);
  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard', r.raceId],
    queryFn: () => api.get(`/registrations/leaderboard/${r.raceId}`).then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const myEntry = leaderboard?.find((e: any) => e.participantId === participantId);
  const rank = myEntry?.rank;
  const total = leaderboard?.length ?? 0;
  const topPercent = rank && total ? Math.round((rank / total) * 100) : null;
  const genderFinishers = leaderboard?.filter((e: any) => e.gender === r.participant?.gender) ?? [];
  const genderRank = genderFinishers.findIndex((e: any) => e.participantId === participantId) + 1;

  return (
    <div className="flex items-center gap-4 px-5 py-4">
      {/* Rank medal */}
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white font-black text-lg ${
        rank === 1 ? 'bg-yellow-400' : rank === 2 ? 'bg-gray-400' : rank === 3 ? 'bg-amber-600' : 'bg-blue-100 text-blue-700'
      }`}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank ? `#${rank}` : '—'}
      </div>

      {/* Race info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{r.race?.name}</p>
        <p className="text-xs text-gray-400">
          {r.race?.distance} km · {r.race?.startTime ? new Date(r.race.startTime).toLocaleDateString() : ''}
        </p>
        {ms && <p className="text-xs text-gray-500 mt-0.5">{pacePerKm(ms, r.race?.distance ?? 0)}</p>}
      </div>

      {/* Time + ranking */}
      <div className="text-right shrink-0">
        {ms && <p className="text-base font-black text-gray-900">{msToTime(ms)}</p>}
        {rank && total > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">
            {rank}/{total} overall
            {genderRank > 0 && ` · ${genderRank}${r.participant?.gender === 'M' ? 'M' : 'F'}`}
          </p>
        )}
        {topPercent !== null && topPercent <= 25 && (
          <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
            Top {topPercent}%
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Games tab ─── */
interface GameSession {
  id: string; eventId: string; title: string;
  type: 'TAMBOLA' | 'QUIZ'; status: 'WAITING' | 'ACTIVE' | 'FINISHED';
  calledNumbers: number[]; currentQuestion: number; questionOpenAt?: string;
  questions?: { question: string; options: string[]; correctOption: number; timeLimit: number }[];
  tambolaClaims?: { id: string; participantId: string; claimType: string; verified?: boolean | null }[];
}

function TambolaPlayerCard({ session, participantId, participantName }: { session: GameSession; participantId: string; participantName: string }) {
  const toast = useToast();
  const [markedNums, setMarkedNums] = useState<Set<number>>(new Set());

  const { data: card, refetch: refetchCard } = useQuery({
    queryKey: ['tambola-card', session.id, participantId],
    queryFn: () => api.get(`/games/${session.id}/card`).then((r) => r.data),
    enabled: session.status !== 'WAITING',
  });

  const claimMutation = useMutation({
    mutationFn: (claimType: string) => api.post(`/games/${session.id}/claim`, { claimType }),
    onSuccess: () => toast.success('Claim submitted! Waiting for volunteer verification.'),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not claim'),
  });

  const calledSet = new Set(session.calledNumbers);
  const rows: number[][] = card ? (card.rows as number[][]) : [];

  const rowComplete = (row: number[]) => row.filter((n) => n > 0).every((n) => calledSet.has(n));
  const completedRows = rows.filter(rowComplete).length;
  const allComplete = rows.length > 0 && rows.every(rowComplete);

  if (session.status === 'WAITING') {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400 text-center">
        <Hash className="h-8 w-8 mb-2" />
        <p className="text-sm font-medium">Waiting for volunteer to start the game…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Last called */}
      {session.calledNumbers.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-black">
            {session.calledNumbers[session.calledNumbers.length - 1]}
          </div>
          <div>
            <p className="text-xs text-gray-400">Last called</p>
            <p className="text-sm text-gray-500">{session.calledNumbers.length}/90 numbers drawn</p>
          </div>
        </div>
      )}

      {/* Card grid */}
      {rows.length > 0 && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-blue-600 py-1.5 text-center text-xs font-black text-white tracking-widest">TAMBOLA</div>
          {rows.map((row, ri) => (
            <div key={ri} className={`grid grid-cols-9 ${ri < rows.length - 1 ? 'border-b border-gray-200' : ''}`}>
              {row.map((n, ci) => {
                const blank = n === 0;
                const called = !blank && calledSet.has(n);
                const marked = !blank && markedNums.has(n);
                return (
                  <div key={ci}
                    onClick={() => { if (!blank && called) setMarkedNums((s) => { const ns = new Set(s); ns.has(n) ? ns.delete(n) : ns.add(n); return ns; }); }}
                    className={`flex h-10 items-center justify-center text-sm font-bold border-r border-gray-100 last:border-r-0 transition-all cursor-default
                      ${blank ? 'bg-gray-50' : called ? (marked ? 'bg-blue-600 text-white cursor-pointer' : 'bg-blue-100 text-blue-700 cursor-pointer ring-1 ring-blue-200') : 'text-gray-700'}`}>
                    {blank ? '' : n}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      {!card && session.status === 'ACTIVE' && (
        <button onClick={() => refetchCard()} className="text-sm text-blue-600 underline">Load my card</button>
      )}

      {/* Claim buttons */}
      {session.status === 'ACTIVE' && rows.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => claimMutation.mutate('ONE_LINE')} disabled={completedRows < 1 || claimMutation.isPending}
            className="flex-1 rounded-lg border-2 border-blue-300 bg-blue-50 text-blue-700 font-semibold py-2 text-sm hover:bg-blue-100 disabled:opacity-40">
            🎯 1 Line {completedRows >= 1 ? '✓' : ''}
          </button>
          <button onClick={() => claimMutation.mutate('TWO_LINES')} disabled={completedRows < 2 || claimMutation.isPending}
            className="flex-1 rounded-lg border-2 border-purple-300 bg-purple-50 text-purple-700 font-semibold py-2 text-sm hover:bg-purple-100 disabled:opacity-40">
            🎯 2 Lines {completedRows >= 2 ? '✓' : ''}
          </button>
          <button onClick={() => claimMutation.mutate('FULL_HOUSE')} disabled={!allComplete || claimMutation.isPending}
            className="flex-1 rounded-lg border-2 border-yellow-400 bg-yellow-50 text-yellow-700 font-semibold py-2 text-sm hover:bg-yellow-100 disabled:opacity-40">
            🏠 Full House {allComplete ? '✓' : ''}
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">Tap a number to mark it · Numbers highlighted in blue are called</p>
    </div>
  );
}

function QuizPlayerCard({ session, participantId }: { session: GameSession; participantId: string }) {
  const toast = useToast();
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const prevQIdx = useState(session.currentQuestion)[0];

  useEffect(() => {
    setSelected(null);
    setSubmitted(false);
    setElapsed(0);
  }, [session.currentQuestion]);

  useEffect(() => {
    if (!session.questionOpenAt) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - new Date(session.questionOpenAt!).getTime()) / 1000)), 500);
    return () => clearInterval(t);
  }, [session.questionOpenAt]);

  const answerMutation = useMutation({
    mutationFn: (selectedOption: number) => api.post(`/games/${session.id}/answer`, { questionIndex: session.currentQuestion, selectedOption }),
    onSuccess: () => { setSubmitted(true); toast.success('Answer submitted!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not submit'),
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['my-quiz-leaderboard', session.id],
    queryFn: () => api.get(`/games/${session.id}/leaderboard`).then((r) => r.data),
    refetchInterval: 5000,
    enabled: session.status !== 'WAITING',
  });

  const questions = session.questions ?? [];
  const currentQ = questions[session.currentQuestion];
  const tl = currentQ?.timeLimit ?? 30;
  const pct = Math.min(100, (elapsed / tl) * 100);
  const timeUp = elapsed >= tl;

  if (session.status === 'WAITING') {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400 text-center">
        <Zap className="h-8 w-8 mb-2" />
        <p className="text-sm font-medium">Quiz will start soon…</p>
      </div>
    );
  }

  if (session.status === 'FINISHED') {
    const myEntry = leaderboard?.find((e: any) => e.participantId === participantId);
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-purple-50 border border-purple-200 p-6 text-center">
          <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide mb-2">Quiz Finished!</p>
          {myEntry && (
            <>
              <p className="text-5xl font-black text-purple-700 mb-1">#{myEntry.rank}</p>
              <p className="text-lg font-bold text-gray-900">{myEntry.score} pts</p>
              <p className="text-sm text-gray-500 mt-1">{myEntry.correct}/{questions.length} correct answers</p>
            </>
          )}
        </div>
        {leaderboard && leaderboard.length > 0 && (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Leaderboard</div>
            {leaderboard.slice(0, 5).map((e: any) => (
              <div key={e.participantId} className={`flex items-center gap-3 px-4 py-2.5 border-t border-gray-100 ${e.participantId === participantId ? 'bg-blue-50' : ''}`}>
                <span className="w-5 text-xs font-bold text-gray-400">#{e.rank}</span>
                <span className="flex-1 text-sm truncate">{e.name}</span>
                <span className="text-sm font-bold text-blue-600">{e.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!currentQ) return <div className="py-8 text-center text-sm text-gray-400">Waiting for next question…</div>;

  return (
    <div className="space-y-4">
      {/* Timer bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Q{session.currentQuestion + 1}/{questions.length}</span>
          <span className={`font-bold ${timeUp ? 'text-red-500' : 'text-blue-600'}`}>{Math.max(0, tl - elapsed)}s</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-red-500' : pct > 70 ? 'bg-orange-400' : 'bg-blue-500'}`}
            style={{ width: `${100 - pct}%` }} />
        </div>
      </div>

      <p className="text-base font-bold text-gray-900">{currentQ.question}</p>

      {/* Options */}
      <div className="grid grid-cols-1 gap-2">
        {currentQ.options.map((opt, i) => {
          const isSelected = selected === i;
          const showResult = submitted;
          const isCorrect = i === currentQ.correctOption;
          return (
            <button key={i} disabled={submitted || timeUp || answerMutation.isPending}
              onClick={() => { setSelected(i); answerMutation.mutate(i); }}
              className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all
                ${showResult && isCorrect ? 'border-green-400 bg-green-50 text-green-800'
                : showResult && isSelected && !isCorrect ? 'border-red-400 bg-red-50 text-red-700'
                : isSelected ? 'border-blue-400 bg-blue-50 text-blue-800'
                : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50 text-gray-700'}`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold">{String.fromCharCode(65 + i)}</span>
              <span className="flex-1">{opt}</span>
              {showResult && isCorrect && <Check className="h-4 w-4 text-green-500" />}
            </button>
          );
        })}
      </div>

      {timeUp && !submitted && <p className="text-sm text-red-500 text-center font-medium">⏱ Time's up!</p>}
      {submitted && <p className="text-sm text-blue-600 text-center font-medium">✓ Answer submitted — waiting for next question</p>}
    </div>
  );
}

function GamesTab({ registrations, userId, participantName }: { registrations: Registration[]; userId: string; participantName: string }) {
  const toast = useToast();
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const participantId = userId; // game records store auth user.id

  const eventIds = [...new Set(registrations.map((r) => (r.race as any)?.eventId ?? r.raceId).filter(Boolean))];

  const { data: games = [] } = useQuery<GameSession[]>({
    queryKey: ['participant-games', eventIds.join(',')],
    queryFn: () => api.post('/games/my-events', { eventIds }).then((r) => r.data),
    enabled: eventIds.length > 0,
    refetchInterval: 5000,
  });

  const { data: selectedGame } = useQuery<GameSession>({
    queryKey: ['game-state', selectedGameId],
    queryFn: () => api.get(`/games/${selectedGameId}/state`).then((r) => r.data),
    enabled: !!selectedGameId,
    refetchInterval: 3000,
  });

  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Gamepad2 className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">No active games right now</p>
        <p className="text-sm text-gray-400 mt-1">Games started by volunteers will appear here</p>
      </div>
    );
  }

  const game = selectedGame ?? (games.find((g) => g.id === selectedGameId) ?? games[0]);

  return (
    <div className="space-y-4">
      {/* Game picker (if multiple) */}
      {games.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {games.map((g) => (
            <button key={g.id} onClick={() => setSelectedGameId(g.id)}
              className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${(selectedGameId ?? games[0]?.id) === g.id ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {g.type === 'TAMBOLA' ? '🎱' : '⚡'} {g.title}
              {g.status === 'ACTIVE' && <span className="ml-1.5 h-1.5 w-1.5 inline-block rounded-full bg-green-500" />}
            </button>
          ))}
        </div>
      )}

      {/* Active game panel */}
      {game && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              {game.type === 'TAMBOLA' ? <Hash className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{game.title}</h3>
              <p className="text-xs text-gray-400">{game.type === 'TAMBOLA' ? 'Tambola' : 'Quiz'} · <span className={`font-semibold ${game.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-500'}`}>{game.status}</span></p>
            </div>
          </div>

          {game.type === 'TAMBOLA'
            ? <TambolaPlayerCard session={game} participantId={participantId} participantName={participantName} />
            : <QuizPlayerCard session={game} participantId={participantId} />}
        </div>
      )}
    </div>
  );
}

/* ─── Main page ─── */
type Tab = 'registrations' | 'stats' | 'profile' | 'medical' | 'games';

export default function MyRegistrationsPage() {
  const [qrRegistration, setQrRegistration] = useState<Registration | null>(null);
  const [mapRegistration, setMapRegistration] = useState<Registration | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('registrations');
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingMedical, setEditingMedical] = useState(false);
  const [profileForm, setProfileForm] = useState<any>(null);
  const [medicalForm, setMedicalForm] = useState<any>(null);

  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: participant, isLoading: profileLoading, error: profileError } = useQuery<Participant>({
    queryKey: ['participant-me'],
    queryFn: () => api.get('/participants/me').then((r) => r.data),
  });

  const { data: registrationsData, isLoading: regsLoading } = useQuery({
    queryKey: ['my-registrations', participant?.id],
    queryFn: () => api.get('/registrations', { params: { participantId: participant!.id, limit: 100 } }).then((r) => r.data),
    enabled: !!participant?.id,
  });
  const registrations: Registration[] = registrationsData?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch('/participants/me', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participant-me'] });
      toast.success('Saved.');
      setEditingProfile(false);
      setEditingMedical(false);
    },
    onError: () => toast.error('Could not save changes.'),
  });

  const startEditProfile = () => {
    setProfileForm({ fullName: participant?.fullName ?? '', phone: (participant as any)?.phone ?? '', country: (participant as any)?.country ?? 'Tunisie' });
    setEditingProfile(true);
  };

  const startEditMedical = () => {
    setMedicalForm({ bloodType: (participant as any)?.bloodType ?? '', emergencyContact: (participant as any)?.emergencyContact ?? '', emergencyPhone: (participant as any)?.emergencyPhone ?? '', medicalConditions: (participant as any)?.medicalConditions ?? '' });
    setEditingMedical(true);
  };

  const upcoming = registrations.filter((r) => ['REGISTERED', 'CHECKED_IN'].includes(r.status));
  const past = registrations.filter((r) => !['REGISTERED', 'CHECKED_IN'].includes(r.status));

  if (profileLoading) return <div className="flex items-center justify-center py-24 text-gray-400">Loading…</div>;
  if (profileError) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertCircle className="h-10 w-10 text-yellow-400 mb-3" />
      <h2 className="text-lg font-semibold text-gray-900">No participant profile found</h2>
      <p className="mt-1 text-sm text-gray-500">Contact the event organizer.</p>
    </div>
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'registrations', label: 'Races', icon: <Flag className="h-4 w-4" /> },
    { id: 'stats', label: 'Stats', icon: <BarChart2 className="h-4 w-4" /> },
    { id: 'games', label: 'Games', icon: <Gamepad2 className="h-4 w-4" /> },
    { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
    { id: 'medical', label: 'Medical', icon: <HeartPulse className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-5">
      {qrRegistration && <QRModal registration={qrRegistration} onClose={() => setQrRegistration(null)} />}

      {/* GPX map modal */}
      {mapRegistration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative flex flex-col w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden" style={{ height: '85vh' }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 shrink-0">
              <Route className="h-5 w-5 text-blue-500" />
              <div className="flex-1">
                <h2 className="font-semibold text-gray-900">{mapRegistration.race?.name}</h2>
                <p className="text-xs text-gray-400">
                  {mapRegistration.race?.distance} km · {mapRegistration.race?.startTime ? formatDateTime(mapRegistration.race.startTime) : ''}
                  {mapRegistration.status === 'FINISHED' && elapsedMs(mapRegistration.startTime, mapRegistration.finishTime) && (
                    <span className="ml-2 text-green-600 font-semibold">🏁 {msToTime(elapsedMs(mapRegistration.startTime, mapRegistration.finishTime)!)}</span>
                  )}
                </p>
              </div>
              <button onClick={() => setMapRegistration(null)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <GpxMap raceId={mapRegistration.raceId} raceName={mapRegistration.race?.name} />
            </div>
          </div>
        </div>
      )}

      {/* Athlete header */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-xl font-black">
          {participant?.fullName?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900">{participant?.fullName}</h1>
          <div className="flex items-center gap-3 mt-0.5">
            {(participant as any)?.country && <CountryFlag country={(participant as any).country} size={14} />}
            <span className="text-xs text-gray-400">{participant?.gender === 'M' ? 'Male' : 'Female'}</span>
            {participant?.birthdate && (
              <span className="text-xs text-gray-400">
                Age {new Date().getFullYear() - new Date(participant.birthdate).getFullYear()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              activeTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Registrations ── */}
      {activeTab === 'registrations' && (
        <div className="space-y-5">
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Upcoming</p>
              {upcoming.map((r) => <RegistrationCard key={r.id} r={r} onQr={() => setQrRegistration(r)} onMap={() => setMapRegistration(r)} />)}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">History</p>
              {past.map((r) => <RegistrationCard key={r.id} r={r} onQr={() => setQrRegistration(r)} onMap={() => setMapRegistration(r)} past />)}
            </div>
          )}
          {registrations.length === 0 && !regsLoading && (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-20 text-center">
              <Flag className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-gray-500">No registrations yet.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Games ── */}
      {activeTab === 'games' && (
        <GamesTab registrations={registrations} userId={(participant as any)?.userId ?? ''} participantName={participant?.fullName ?? ''} />
      )}

      {/* ── Stats ── */}
      {activeTab === 'stats' && participant && (
        <StatsTab registrations={registrations} participantId={participant.id} />
      )}

      {/* ── Profile ── */}
      {activeTab === 'profile' && participant && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Personal Information</h2>
            {!editingProfile
              ? <button onClick={startEditProfile} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"><Edit2 className="h-4 w-4" /> Edit</button>
              : <div className="flex gap-2">
                  <button onClick={() => updateMutation.mutate(profileForm)} disabled={updateMutation.isPending} className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg">
                    <Save className="h-4 w-4" /> {updateMutation.isPending ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditingProfile(false)} className="text-sm text-gray-500 px-2">Cancel</button>
                </div>
            }
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name">
              {editingProfile
                ? <input className={inp} value={profileForm.fullName} onChange={(e) => setProfileForm((f: any) => ({ ...f, fullName: e.target.value }))} />
                : <p className="text-sm font-medium text-gray-900">{participant.fullName}</p>}
            </Field>
            <Field label="Email">
              <p className="text-sm font-medium text-gray-900">{participant.email}</p>
              <p className="text-xs text-gray-400">Contact organizer to change</p>
            </Field>
            <Field label="Gender"><p className="text-sm font-medium text-gray-900">{participant.gender === 'M' ? 'Male' : 'Female'}</p></Field>
            <Field label="Date of Birth"><p className="text-sm font-medium text-gray-900">{participant.birthdate ? new Date(participant.birthdate).toLocaleDateString() : '—'}</p></Field>
            <Field label="Phone">
              {editingProfile
                ? <input className={inp} placeholder="+216 XX XXX XXX" value={profileForm.phone} onChange={(e) => setProfileForm((f: any) => ({ ...f, phone: e.target.value }))} />
                : <p className="text-sm font-medium text-gray-900">{(participant as any).phone ?? '—'}</p>}
            </Field>
            <Field label="Nationality">
              {editingProfile
                ? <select className={inp} value={profileForm.country} onChange={(e) => setProfileForm((f: any) => ({ ...f, country: e.target.value }))}>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                : (participant as any).country
                  ? <CountryFlag country={(participant as any).country} size={16} />
                  : <p className="text-sm text-gray-400">—</p>}
            </Field>
          </div>
        </div>
      )}

      {/* ── Medical ── */}
      {activeTab === 'medical' && participant && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Emergency & Medical Info</h2>
                <p className="text-xs text-gray-400 mt-0.5">Only visible to medical volunteers</p>
              </div>
              {!editingMedical
                ? <button onClick={startEditMedical} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium"><Edit2 className="h-4 w-4" /> Edit</button>
                : <div className="flex gap-2">
                    <button onClick={() => updateMutation.mutate(medicalForm)} disabled={updateMutation.isPending} className="flex items-center gap-1.5 text-sm bg-red-500 hover:bg-red-600 text-white font-medium px-3 py-1.5 rounded-lg">
                      <Save className="h-4 w-4" /> {updateMutation.isPending ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditingMedical(false)} className="text-sm text-gray-500 px-2">Cancel</button>
                  </div>
              }
            </div>
            <div className={`rounded-xl p-5 text-center border-2 ${(participant as any).bloodType ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-dashed border-gray-200'}`}>
              {editingMedical ? (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Blood Type</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {BLOOD_TYPES.map((bt) => (
                      <button key={bt} onClick={() => setMedicalForm((f: any) => ({ ...f, bloodType: bt }))}
                        className={`w-14 h-10 rounded-lg border-2 font-bold text-sm transition-colors ${medicalForm?.bloodType === bt ? 'bg-red-500 border-red-500 text-white' : 'border-gray-200 text-gray-600 hover:border-red-300'}`}>
                        {bt}
                      </button>
                    ))}
                    <button onClick={() => setMedicalForm((f: any) => ({ ...f, bloodType: '' }))}
                      className={`w-14 h-10 rounded-lg border-2 font-bold text-sm transition-colors ${!medicalForm?.bloodType ? 'bg-gray-400 border-gray-400 text-white' : 'border-gray-200 text-gray-400'}`}>?</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Blood Type</p>
                  <p className={`text-5xl font-black mt-2 ${(participant as any).bloodType ? 'text-red-600' : 'text-gray-300'}`}>{(participant as any).bloodType ?? '?'}</p>
                  {!(participant as any).bloodType && <p className="text-xs text-gray-400 mt-1">Tap Edit to set your blood type</p>}
                </>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Emergency Contact">
                {editingMedical
                  ? <input className={inp} placeholder="Full name" value={medicalForm.emergencyContact} onChange={(e) => setMedicalForm((f: any) => ({ ...f, emergencyContact: e.target.value }))} />
                  : (participant as any).emergencyContact
                    ? <p className="text-sm font-medium text-gray-900">{(participant as any).emergencyContact}</p>
                    : <p className="text-sm text-gray-400 italic">Not set</p>}
              </Field>
              <Field label="Emergency Phone">
                {editingMedical
                  ? <input className={inp} type="tel" placeholder="+216 XX XXX XXX" value={medicalForm.emergencyPhone} onChange={(e) => setMedicalForm((f: any) => ({ ...f, emergencyPhone: e.target.value }))} />
                  : (participant as any).emergencyPhone
                    ? <a href={`tel:${(participant as any).emergencyPhone}`} className="flex items-center gap-1.5 text-sm font-medium text-blue-600"><Phone className="h-4 w-4" /> {(participant as any).emergencyPhone}</a>
                    : <p className="text-sm text-gray-400 italic">Not set</p>}
              </Field>
            </div>
            <Field label="Medical Conditions / Allergies">
              {editingMedical
                ? <textarea className={`${inp} h-auto py-2`} rows={3} placeholder="e.g. Diabetic, asthma, penicillin allergy…" value={medicalForm.medicalConditions} onChange={(e) => setMedicalForm((f: any) => ({ ...f, medicalConditions: e.target.value }))} />
                : (participant as any).medicalConditions
                  ? <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{(participant as any).medicalConditions}</p>
                  : <p className="text-sm text-gray-400 italic">None reported</p>}
            </Field>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
            🔒 Stored securely — only shown to authorised medical volunteers at the event in case of emergency.
          </div>
        </div>
      )}
    </div>
  );
}

const inp = 'flex w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:border-blue-400';
