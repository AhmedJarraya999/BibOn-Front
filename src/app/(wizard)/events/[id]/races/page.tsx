'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ChevronLeft, Zap, Clock, Users, MapPin, Radio, Link2, Check } from 'lucide-react';
import api from '@/lib/api';
import { Logo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';
import { Modal } from '@/components/ui/modal';
import { RaceForm } from '@/components/races/race-form';
import { type Race } from '@/types';

export default function RacesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Race | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyCheckinLink = (raceId: string) => {
    const url = `${window.location.origin}/checkin?raceId=${raceId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(raceId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const { data: eventData } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['races', id],
    queryFn: () => api.get('/races', { params: { eventId: id, limit: 100 } }).then(r => r.data),
  });
  const races: Race[] = data?.data ?? data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (raceId: string) => api.delete(`/races/${raceId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['races'] }); toast.success('Course supprimée.'); },
    onError: () => toast.error('Erreur lors de la suppression.'),
  });

  const handleDelete = async (race: Race) => {
    const ok = await confirm({ title: 'Supprimer la course', message: `Supprimer "${race.name}" ? Toutes les inscriptions seront également supprimées.`, confirmLabel: 'Supprimer' });
    if (ok) deleteMutation.mutate(race.id);
  };

  const totalRegistrations = races.reduce((acc: number, r: any) => acc + (r._count?.registrations ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-[#111111]/95 backdrop-blur border-b border-white/8 px-8 py-4 flex items-center justify-between">
        <Logo size="sm" variant="dark" />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button onClick={() => router.push(`/events/${id}`)} className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
            <ChevronLeft className="h-4 w-4" /> {eventData?.name ?? 'Événement'}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white">Courses</h1>
            <p className="text-white/40 text-sm mt-0.5">{races.length} course{races.length !== 1 ? 's' : ''} · {totalRegistrations} inscription{totalRegistrations !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 rounded-xl bg-[#FF8C00] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#e67e00] shadow-lg shadow-[#FF8C00]/20 transition-all hover:scale-[1.02]">
            <Plus className="h-4 w-4" /> Ajouter une course
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Courses', value: races.length },
            { label: 'Inscriptions totales', value: totalRegistrations },
            { label: 'Revenus estimés', value: `${races.reduce((acc: number, r: any) => acc + (Number(r.fee) * (r._count?.registrations ?? 0)), 0).toFixed(0)} TND` },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-white/8 bg-white/3 px-5 py-4">
              <p className="text-3xl font-black text-white">{s.value}</p>
              <p className="text-sm text-white/40 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Race cards */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 rounded-full border-2 border-[#FF8C00] border-t-transparent animate-spin" />
          </div>
        )}

        {!isLoading && races.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
            <Zap className="h-10 w-10 text-white/15 mx-auto mb-3" />
            <p className="text-white/30 text-sm">Aucune course pour le moment</p>
            <button onClick={() => setCreateOpen(true)} className="mt-3 text-[#FF8C00] text-sm hover:underline">+ Ajouter la première course</button>
          </div>
        )}

        <div className="space-y-3">
          {races.map((race: any) => (
            <div key={race.id} className="group rounded-2xl border border-white/8 bg-white/3 p-5 hover:border-[#FF8C00]/30 hover:bg-[#FF8C00]/3 transition-all">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="h-12 w-12 rounded-xl bg-[#FF8C00]/15 flex items-center justify-center flex-shrink-0">
                  <Zap className="h-5 w-5 text-[#FF8C00]" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-white">{race.name}</h3>
                    {race.type && (
                      <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-white/40">{race.type}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-white/40 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5" /> {race.distance} km
                    </span>
                    {race.startTime && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(race.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {race.endTime && ` → ${new Date(race.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {race._count?.registrations ?? 0} inscrit{(race._count?.registrations ?? 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {race.description && (
                    <p className="text-xs text-white/30 mt-1.5 line-clamp-1">{race.description}</p>
                  )}
                </div>

                {/* Fee + actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-lg font-black text-white">
                      {Number(race.fee) === 0 ? 'Gratuit' : `${race.fee} TND`}
                    </p>
                    <p className="text-xs text-white/30">par inscrit</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => copyCheckinLink(race.id)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-colors ${
                        copiedId === race.id
                          ? 'border-green-500/30 bg-green-500/10 text-green-400'
                          : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                      }`}>
                      {copiedId === race.id ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                      {copiedId === race.id ? 'Copié !' : 'Check-in'}
                    </button>
                    <button onClick={() => router.push(`/events/${id}/races/${race.id}/checkpoints`)}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/50 hover:bg-white/10 hover:text-white transition-colors">
                      <MapPin className="h-3.5 w-3.5" /> Checkpoints
                    </button>
                    <button onClick={() => router.push(`/events/${id}/races/${race.id}/live`)}
                      className="flex items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2 text-xs text-green-400 hover:bg-green-500/15 transition-colors">
                      <Radio className="h-3.5 w-3.5" /> Live
                    </button>
                    <button onClick={() => setEditTarget(race)}
                      className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/40 hover:bg-white/10 hover:text-white transition-colors">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(race)}
                      className="rounded-lg border border-red-500/20 bg-red-500/5 p-2 text-red-400 hover:bg-red-500/15 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {createOpen && (
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Ajouter une course">
          <RaceForm
            defaultEventId={id}
            onSuccess={() => { setCreateOpen(false); qc.invalidateQueries({ queryKey: ['races'] }); toast.success('Course créée !'); }}
          />
        </Modal>
      )}

      {editTarget && (
        <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Modifier la course">
          <RaceForm
            race={editTarget}
            defaultEventId={id}
            onSuccess={() => { setEditTarget(null); qc.invalidateQueries({ queryKey: ['races'] }); toast.success('Course mise à jour.'); }}
          />
        </Modal>
      )}
    </div>
  );
}
