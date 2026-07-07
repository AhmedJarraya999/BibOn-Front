'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronLeft, ArrowUp, ArrowDown, Pencil, Trash2, Flag, Link2, Check } from 'lucide-react';
import api from '@/lib/api';
import { Logo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';
import { CheckpointForm } from '@/components/checkpoints/checkpoint-form';

const TYPE_META: Record<string, { label: string; emoji: string; color: string }> = {
  TIMING:        { label: 'Timing',         emoji: '⏱',   color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  EAU:           { label: 'Eau',            emoji: '💧',   color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
  RAVITO:        { label: 'Ravitaillement', emoji: '🥤',   color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  TIMING_RAVITO: { label: 'Timing + Ravito',emoji: '⏱🥤', color: 'text-[#FF8C00] bg-[#FF8C00]/10 border-[#FF8C00]/20' },
};

interface Checkpoint {
  id: string;
  name: string;
  order: number;
  type: string;
  cutoffTime?: string | null;
  raceId: string;
  token?: string | null;
  _count?: { scans: number };
}

export default function CheckpointsPage() {
  const { id, raceId } = useParams<{ id: string; raceId: string }>();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Checkpoint | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyLink = (cp: Checkpoint) => {
    if (!cp.token) return;
    navigator.clipboard.writeText(`${window.location.origin}/cp/${cp.token}`);
    setCopiedId(cp.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const { data: raceData } = useQuery({
    queryKey: ['race', raceId],
    queryFn: () => api.get(`/races/${raceId}`).then(r => r.data),
  });

  const { data: checkpoints = [], isLoading } = useQuery<Checkpoint[]>({
    queryKey: ['checkpoints', raceId],
    queryFn: () => api.get('/checkpoints', { params: { raceId } }).then(r => r.data),
  });

  const sorted = [...checkpoints].sort((a, b) => a.order - b.order);

  const deleteMutation = useMutation({
    mutationFn: (cpId: string) => api.delete(`/checkpoints/${cpId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['checkpoints', raceId] }); toast.success('Checkpoint supprimé.'); },
    onError: () => toast.error('Erreur lors de la suppression.'),
  });

  const reorderMutation = useMutation({
    mutationFn: ({ cpId, newOrder }: { cpId: string; newOrder: number }) =>
      api.patch(`/checkpoints/${cpId}`, { order: newOrder }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checkpoints', raceId] }),
  });

  const handleDelete = async (cp: Checkpoint) => {
    const ok = await confirm({
      title: 'Supprimer le checkpoint',
      message: `Supprimer "${cp.name}" ? Tous les passages enregistrés seront également supprimés.`,
      confirmLabel: 'Supprimer',
    });
    if (ok) deleteMutation.mutate(cp.id);
  };

  const move = (cp: Checkpoint, direction: 'up' | 'down') => {
    const idx = sorted.findIndex(c => c.id === cp.id);
    const swapWith = direction === 'up' ? sorted[idx - 1] : sorted[idx + 1];
    if (!swapWith) return;
    reorderMutation.mutate({ cpId: cp.id, newOrder: swapWith.order });
    reorderMutation.mutate({ cpId: swapWith.id, newOrder: cp.order });
  };

  const nextOrder = sorted.length > 0 ? sorted[sorted.length - 1].order + 1 : 1;

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-[#111111]/95 backdrop-blur border-b border-white/8 px-8 py-4 flex items-center justify-between">
        <Logo size="sm" variant="dark" />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button onClick={() => router.push(`/events/${id}/races`)}
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
            <ChevronLeft className="h-4 w-4" /> {raceData?.name ?? 'Course'}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white">Checkpoints</h1>
            <p className="text-white/40 text-sm mt-0.5">
              {sorted.length} point{sorted.length !== 1 ? 's' : ''} de contrôle
              {raceData?.distance ? ` · ${raceData.distance} km` : ''}
            </p>
          </div>
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-[#FF8C00] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#e67e00] shadow-lg shadow-[#FF8C00]/20 transition-all hover:scale-[1.02]">
            <Plus className="h-4 w-4" /> Ajouter un checkpoint
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 rounded-full border-2 border-[#FF8C00] border-t-transparent animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && sorted.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
            <Flag className="h-10 w-10 text-white/15 mx-auto mb-3" />
            <p className="text-white/30 text-sm">Aucun checkpoint pour le moment</p>
            <button onClick={() => setCreateOpen(true)} className="mt-3 text-[#FF8C00] text-sm hover:underline">
              + Ajouter le premier checkpoint
            </button>
          </div>
        )}

        {/* Course line visualization + list */}
        {sorted.length > 0 && (
          <div className="relative">
            {/* Vertical connector */}
            <div className="absolute left-[27px] top-10 bottom-10 w-px bg-white/8" />

            <div className="space-y-3">
              {sorted.map((cp, idx) => {
                const meta = TYPE_META[cp.type] ?? TYPE_META.TIMING;
                const isFirst = idx === 0;
                const isLast = idx === sorted.length - 1;

                return (
                  <div key={cp.id} className="group relative flex items-start gap-4">
                    {/* Order bubble */}
                    <div className="z-10 flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#1a1a1a] text-center">
                      <span className="text-lg leading-none">{meta.emoji}</span>
                      <span className="text-[10px] text-white/30 mt-0.5">#{cp.order}</span>
                    </div>

                    {/* Card */}
                    <div className="flex-1 rounded-2xl border border-white/8 bg-white/3 px-5 py-4 hover:border-[#FF8C00]/20 transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-white">{cp.name}</h3>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.color}`}>
                              {meta.label}
                            </span>
                            {cp._count?.scans !== undefined && cp._count.scans > 0 && (
                              <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/40">
                                {cp._count.scans} passage{cp._count.scans !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          {cp.cutoffTime && (
                            <p className="text-xs text-white/35 mt-1">
                              Cutoff : {new Date(cp.cutoffTime).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => copyLink(cp)}
                            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              copiedId === cp.id
                                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                                : 'border-white/10 bg-white/5 text-white/40 hover:text-white'
                            }`}>
                            {copiedId === cp.id ? <Check className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                            {copiedId === cp.id ? 'Copié' : 'Lien'}
                          </button>
                          <button onClick={() => move(cp, 'up')} disabled={isFirst}
                            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/40 hover:text-white disabled:opacity-20 transition-colors">
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => move(cp, 'down')} disabled={isLast}
                            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/40 hover:text-white disabled:opacity-20 transition-colors">
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setEditTarget(cp)}
                            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/40 hover:text-white transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(cp)}
                            className="rounded-lg border border-red-500/20 bg-red-500/5 p-1.5 text-red-400 hover:bg-red-500/15 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {createOpen && (
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Ajouter un checkpoint">
          <CheckpointForm
            raceId={raceId}
            nextOrder={nextOrder}
            onSuccess={() => setCreateOpen(false)}
          />
        </Modal>
      )}

      {editTarget && (
        <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Modifier le checkpoint">
          <CheckpointForm
            raceId={raceId}
            checkpoint={editTarget}
            onSuccess={() => setEditTarget(null)}
          />
        </Modal>
      )}
    </div>
  );
}
