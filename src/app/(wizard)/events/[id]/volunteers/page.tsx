'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, ChevronLeft, Shield, MapPin } from 'lucide-react';
import api from '@/lib/api';
import { Logo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';
import { Modal } from '@/components/ui/modal';
import { InviteVolunteerForm } from '@/components/volunteers/invite-volunteer-form';
import { VolunteerForm } from '@/components/volunteers/volunteer-form';
import { type Volunteer } from '@/types';

const PERM_LABELS: Record<string, string> = {
  CHECK_IN: 'Check-in',
  BIB_DISTRIBUTION: 'Dossards',
  RAVITO: 'Ravitaillement',
  MEDAL: 'Médailles',
  CHECKPOINT: 'Checkpoint',
  FINISH_LINE: 'Arrivée',
  FINISH: 'Arrivée',
  DISQUALIFY: 'Disqualifier',
  DISTRIBUTE: 'Distribution',
};

const PERM_COLORS: Record<string, string> = {
  CHECK_IN: 'bg-blue-500/15 text-blue-400',
  BIB_DISTRIBUTION: 'bg-[#FF8C00]/15 text-[#FF8C00]',
  RAVITO: 'bg-green-500/15 text-green-400',
  MEDAL: 'bg-yellow-500/15 text-yellow-400',
  CHECKPOINT: 'bg-purple-500/15 text-purple-400',
  FINISH_LINE: 'bg-green-500/15 text-green-400',
  FINISH: 'bg-green-500/15 text-green-400',
  DISQUALIFY: 'bg-red-500/15 text-red-400',
  DISTRIBUTE: 'bg-[#FF8C00]/15 text-[#FF8C00]',
};

export default function VolunteersPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Volunteer | null>(null);

  const { data: eventData } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['volunteers', id],
    queryFn: () => api.get('/volunteers', { params: { eventId: id, limit: 100, page: 1 } }).then(r => {
      console.log('[volunteers] raw response:', r.data);
      return r.data;
    }),
  });
  const volunteers: Volunteer[] = data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (vid: string) => api.delete(`/volunteers/${vid}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['volunteers'] }); toast.success('Bénévole retiré.'); },
    onError: () => toast.error('Erreur lors de la suppression.'),
  });

  const handleDelete = async (v: Volunteer) => {
    const ok = await confirm({ title: 'Retirer le bénévole', message: `Retirer ${v.user?.name ?? 'ce bénévole'} de l'événement ?`, confirmLabel: 'Retirer' });
    if (ok) deleteMutation.mutate(v.id);
  };

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
            <h1 className="text-2xl font-black text-white">Bénévoles</h1>
            <p className="text-white/40 text-sm mt-0.5">{volunteers.length} bénévole{volunteers.length !== 1 ? 's' : ''} assigné{volunteers.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setInviteOpen(true)} className="flex items-center gap-2 rounded-xl bg-[#FF8C00] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#e67e00] shadow-lg shadow-[#FF8C00]/20 transition-all hover:scale-[1.02]">
            <UserPlus className="h-4 w-4" /> Inviter un bénévole
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total', value: volunteers.length },
            { label: 'Check-in', value: volunteers.filter((v: any) => v.permissions?.includes('CHECK_IN')).length },
            { label: 'Distribution', value: volunteers.filter((v: any) => v.permissions?.includes('BIB_DISTRIBUTION') || v.permissions?.includes('DISTRIBUTE')).length },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-white/8 bg-white/3 px-5 py-4">
              <p className="text-3xl font-black text-white">{s.value}</p>
              <p className="text-sm text-white/40 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Volunteers list */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 rounded-full border-2 border-[#FF8C00] border-t-transparent animate-spin" />
          </div>
        )}

        {!isLoading && volunteers.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
            <UserPlus className="h-10 w-10 text-white/15 mx-auto mb-3" />
            <p className="text-white/30 text-sm">Aucun bénévole pour le moment</p>
            <button onClick={() => setInviteOpen(true)} className="mt-3 text-[#FF8C00] text-sm hover:underline">+ Inviter le premier bénévole</button>
          </div>
        )}

        <div className="space-y-3">
          {volunteers.map((v: any) => (
            <div key={v.id} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/3 px-5 py-4 hover:border-white/12 transition-colors">
              {/* Avatar */}
              <div className="h-11 w-11 rounded-full bg-[#FF8C00]/20 flex items-center justify-center text-[#FF8C00] font-black text-sm flex-shrink-0">
                {(v.user?.name ?? '?')[0].toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{v.user?.name ?? '—'}</p>
                <p className="text-xs text-white/35">{v.user?.email ?? ''}</p>
                {v.race && (
                  <p className="text-xs text-white/30 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> {v.race.name}
                  </p>
                )}
              </div>

              {/* Permissions */}
              <div className="flex flex-wrap gap-1.5 justify-end max-w-xs">
                {(v.permissions ?? []).length === 0 && (
                  <span className="text-xs text-white/20">Aucun rôle</span>
                )}
                {(v.permissions ?? []).map((p: string) => (
                  <span key={p} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${PERM_COLORS[p] ?? 'bg-white/10 text-white/40'}`}>
                    <Shield className="h-2.5 w-2.5" />
                    {PERM_LABELS[p] ?? p}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => setEditTarget(v)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/50 hover:bg-white/10 hover:text-white transition-colors">
                  Modifier
                </button>
                <button onClick={() => handleDelete(v)} className="rounded-lg border border-red-500/20 bg-red-500/5 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/15 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {inviteOpen && (
        <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Inviter un bénévole">
          <InviteVolunteerForm
            eventId={id}
            onSuccess={() => { setInviteOpen(false); qc.invalidateQueries({ queryKey: ['volunteers'] }); toast.success('Bénévole invité !'); }}
          />
        </Modal>
      )}

      {editTarget && (
        <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Modifier le bénévole">
          <VolunteerForm
            onSuccess={() => { setEditTarget(null); qc.invalidateQueries({ queryKey: ['volunteers'] }); toast.success('Bénévole mis à jour.'); }}
          />
        </Modal>
      )}
    </div>
  );
}
