'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Flag, MapPin, Calendar, Copy, Check, ExternalLink,
  Settings, ChevronRight, Trophy, ClipboardList, Zap, AlertTriangle
} from 'lucide-react';
import api from '@/lib/api';
import { Logo } from '@/components/ui/logo';
import Link from 'next/link';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

function StatCard({ icon, label, value, sub, color = 'orange' }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: 'orange' | 'green' | 'blue' | 'purple';
}) {
  const colors = {
    orange: 'bg-[#FF8C00]/15 text-[#FF8C00] border-[#FF8C00]/20',
    green:  'bg-green-500/10 text-green-400 border-green-500/20',
    blue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };
  return (
    <div className={`rounded-2xl border p-5 flex items-center gap-4 ${colors[color]}`}>
      <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-current/10">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black text-white">{value}</p>
        <p className="text-sm font-medium opacity-80">{label}</p>
        {sub && <p className="text-xs opacity-50 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function CopyBox({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div>
      <p className="text-xs text-white/40 font-medium mb-1.5 uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <span className="flex-1 text-sm text-white/70 truncate font-mono">{value}</span>
        <button onClick={copy} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex-shrink-0 ${copied ? 'bg-green-500/20 text-green-400' : 'bg-[#FF8C00]/20 text-[#FF8C00] hover:bg-[#FF8C00]/30'}`}>
          {copied ? <><Check className="h-3 w-3" /> Copié</> : <><Copy className="h-3 w-3" /> Copier</>}
        </button>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, desc, href, onClick }: { icon: React.ReactNode; label: string; desc: string; href?: string; onClick?: () => void }) {
  const cls = 'group flex items-center gap-4 rounded-xl border border-white/8 bg-white/3 p-4 hover:border-[#FF8C00]/40 hover:bg-[#FF8C00]/5 transition-all cursor-pointer';
  const inner = (
    <>
      <div className="h-10 w-10 rounded-lg bg-[#FF8C00]/15 flex items-center justify-center text-[#FF8C00] flex-shrink-0 group-hover:bg-[#FF8C00]/25 transition-colors">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-white/40">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-[#FF8C00] transition-colors flex-shrink-0" />
    </>
  );
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  return <button onClick={onClick} className={`${cls} w-full text-left`}>{inner}</button>;
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: racesData } = useQuery({
    queryKey: ['event-races', id],
    queryFn: () => api.get(`/races?eventId=${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: volunteersData } = useQuery({
    queryKey: ['event-volunteers', id],
    queryFn: () => api.get(`/volunteers?eventId=${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: registrationsData } = useQuery({
    queryKey: ['event-registrations', id],
    queryFn: () => api.get(`/registrations?eventId=${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const races = racesData?.data ?? racesData ?? [];
  const volunteers = volunteersData?.data ?? volunteersData ?? [];
  const registrations = registrationsData?.data ?? registrationsData ?? [];

  const registrationLink = `${APP_URL}/e/${event?.slug ?? id}`;
  const checkinLink = `${APP_URL}/checkin`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-2 border-[#FF8C00] border-t-transparent animate-spin" />
          <p className="text-white/40 text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-[#FF8C00] mx-auto mb-3" />
          <p className="text-white font-bold">Événement introuvable</p>
          <button onClick={() => router.push('/events')} className="mt-4 text-sm text-[#FF8C00] hover:underline">Retour aux événements</button>
        </div>
      </div>
    );
  }

  const checkedIn = registrations.filter((r: any) => r.status === 'CHECKED_IN' || r.status === 'FINISHED').length;
  const eventDate = event.date ? new Date(event.date) : null;
  const isUpcoming = eventDate ? eventDate > new Date() : true;

  return (
    <div className="min-h-screen bg-[#111111] text-white">

      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-[#111111]/95 backdrop-blur border-b border-white/8 px-8 py-4 flex items-center justify-between">
        <Logo size="sm" variant="dark" />
        <div className="flex items-center gap-3">
          <Link href="/events" className="text-sm text-white/40 hover:text-white/70 transition-colors">← Mes événements</Link>
          <Link href={`/events/${id}/edit`} className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 hover:bg-white/10 transition-colors">
            <Settings className="h-3.5 w-3.5" /> Paramètres
          </Link>
        </div>
      </div>

      {/* Banner + Event header */}
      <div className="relative">
        {event.bannerUrl ? (
          <div className="relative h-52 overflow-hidden">
            <img src={event.bannerUrl} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/50 to-transparent" />
          </div>
        ) : (
          <div className="h-36 relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,140,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,140,0,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
            <div className="absolute right-0 top-0 w-96 h-full bg-[#FF8C00]/8 blur-3xl" />
          </div>
        )}

        <div className="mx-auto max-w-6xl px-8 pb-8 -mt-16 relative z-10">
          <div className="flex items-end gap-5">
            {/* Event logo */}
            <div className="h-24 w-24 rounded-2xl border-2 border-white/10 bg-[#1a1a1a] flex items-center justify-center flex-shrink-0 overflow-hidden shadow-2xl">
              {event.logoUrl
                ? <img src={event.logoUrl} alt="" className="h-full w-full object-cover" />
                : <span className="text-4xl">🏁</span>}
            </div>
            <div className="pb-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${isUpcoming ? 'bg-green-500/15 text-green-400' : 'bg-white/10 text-white/40'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full inline-block ${isUpcoming ? 'bg-green-400 animate-pulse' : 'bg-white/30'}`} />
                  {isUpcoming ? 'À venir' : 'Terminé'}
                </span>
                {event.organization?.name && (
                  <span className="text-xs text-white/30">{event.organization.name}</span>
                )}
              </div>
              <h1 className="text-3xl font-black text-white truncate">{event.name}</h1>
              <div className="flex items-center gap-4 mt-1.5 text-sm text-white/40 flex-wrap">
                {eventDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {eventDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                )}
                {event.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {[event.city, event.country].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
            </div>

            {/* Public page button */}
            <a href={registrationLink} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 rounded-xl bg-[#FF8C00] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#e67e00] shadow-lg shadow-[#FF8C00]/25 transition-all hover:scale-105 flex-shrink-0">
              <ExternalLink className="h-4 w-4" />
              Page publique
            </a>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-6xl px-8 pb-16">
        <div className="grid gap-8 lg:grid-cols-3">

          {/* Left column — stats + links */}
          <div className="lg:col-span-2 space-y-8">

            {/* Stats */}
            <div>
              <h2 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">Vue d&apos;ensemble</h2>
              <div className="grid grid-cols-2 gap-4">
                <StatCard icon={<ClipboardList className="h-5 w-5" />} label="Inscriptions" value={registrations.length} sub={`${checkedIn} checkés`} color="orange" />
                <StatCard icon={<Users className="h-5 w-5" />} label="Bénévoles" value={volunteers.length} color="blue" />
                <StatCard icon={<Flag className="h-5 w-5" />} label="Courses" value={races.length} color="green" />
                <StatCard icon={<Trophy className="h-5 w-5" />} label="Taux de check-in" value={registrations.length > 0 ? `${Math.round((checkedIn / registrations.length) * 100)}%` : '—'} color="purple" />
              </div>
            </div>

            {/* Races list */}
            {races.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">Courses</h2>
                <div className="space-y-2">
                  {races.map((race: any) => (
                    <div key={race.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-[#FF8C00]/15 flex items-center justify-center">
                          <Zap className="h-4 w-4 text-[#FF8C00]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{race.name}</p>
                          <p className="text-xs text-white/35">{race.distance} km{race.type ? ` · ${race.type}` : ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{Number(race.fee) === 0 ? 'Gratuit' : `${race.fee} TND`}</p>
                        {race.startTime && (
                          <p className="text-xs text-white/35">{new Date(race.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Registration link */}
            <div>
              <h2 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">Liens</h2>
              <div className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-4">
                <CopyBox label="Lien d'inscription" value={registrationLink} />
                <CopyBox label="Lien check-in bénévoles" value={checkinLink} />
              </div>
            </div>
          </div>

          {/* Right column — quick actions */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">Actions rapides</h2>
              <div className="space-y-2">
                <QuickAction
                  icon={<ClipboardList className="h-4 w-4" />}
                  label="Gérer les inscriptions"
                  desc="Voir et modifier les inscriptions"
                  href={`/events/${id}/registrations`}
                />
                <QuickAction
                  icon={<Users className="h-4 w-4" />}
                  label="Gérer les bénévoles"
                  desc="Assigner des postes et rôles"
                  href={`/events/${id}/volunteers`}
                />
                <QuickAction
                  icon={<Flag className="h-4 w-4" />}
                  label="Gérer les courses"
                  desc="Modifier distances et catégories"
                  href={`/events/${id}/races`}
                />
                <QuickAction
                  icon={<Trophy className="h-4 w-4" />}
                  label="Classement & résultats"
                  desc="Voir le classement en temps réel"
                  href={`/events/${id}/results`}
                />
                <QuickAction
                  icon={<AlertTriangle className="h-4 w-4" />}
                  label="Réclamations"
                  desc="Gérer les dossards manquants"
                  href={`/events/${id}/reclamations`}
                />
              </div>
            </div>

            {/* Event info card */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-3">
              <h2 className="text-xs font-bold text-white/30 uppercase tracking-widest">Détails</h2>
              {[
                ['Paiement', event.paymentMode === 'PREPAID_ONLY' ? 'En ligne uniquement' : 'En ligne & sur place'],
                ['Dons', event.acceptDonations ? 'Activés' : 'Désactivés'],
                ['Fuseau', event.timezone ?? '—'],
                ['Contact', event.contactEmail ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 text-sm">
                  <span className="text-white/35">{k}</span>
                  <span className="text-white/70 font-medium text-right truncate">{v}</span>
                </div>
              ))}
            </div>

            {/* Description */}
            {event.description && (
              <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
                <h2 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">Description</h2>
                <p className="text-sm text-white/50 leading-relaxed">{event.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
