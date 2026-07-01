'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, UserPlus, UserMinus, Flag, Droplets, UtensilsCrossed, Timer } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { type Race, type Checkpoint, type Volunteer, type CheckpointType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';

const CHECKPOINT_TYPES: { value: CheckpointType; label: string; icon: React.ReactNode }[] = [
  { value: 'TIMING', label: 'Timing', icon: <Timer className="h-3 w-3" /> },
  { value: 'EAU', label: 'Point d\'eau', icon: <Droplets className="h-3 w-3" /> },
  { value: 'RAVITO', label: 'Ravitaillement', icon: <UtensilsCrossed className="h-3 w-3" /> },
  { value: 'TIMING_RAVITO', label: 'Timing + Ravito', icon: <Flag className="h-3 w-3" /> },
];

const TYPE_COLORS: Record<CheckpointType, string> = {
  TIMING: 'bg-blue-100 text-blue-700',
  EAU: 'bg-cyan-100 text-cyan-700',
  RAVITO: 'bg-orange-100 text-orange-700',
  TIMING_RAVITO: 'bg-purple-100 text-purple-700',
};

const checkpointSchema = z.object({
  name: z.string().min(1),
  order: z.number().int().min(1),
  type: z.enum(['TIMING', 'EAU', 'RAVITO', 'TIMING_RAVITO'] as const),
  cutoffTime: z.string().optional(),
});
type CheckpointFormData = z.infer<typeof checkpointSchema>;

interface Props {
  race: Race;
  eventId: string;
}

export function CheckpointPanel({ race, eventId }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState<string | null>(null); // checkpointId
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const { data: checkpoints = [], isLoading } = useQuery<Checkpoint[]>({
    queryKey: ['checkpoints', race.id],
    queryFn: () => api.get('/checkpoints', { params: { raceId: race.id } }).then((r) => r.data),
  });

  const { data: volunteers = [] } = useQuery<Volunteer[]>({
    queryKey: ['volunteers', eventId],
    queryFn: () => api.get('/volunteers', { params: { eventId } }).then((r) => r.data?.data ?? r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CheckpointFormData>({
    resolver: zodResolver(checkpointSchema) as any,
    defaultValues: { type: 'TIMING', order: (checkpoints.length ?? 0) + 1 },
  });

  const createMutation = useMutation({
    mutationFn: (data: CheckpointFormData) =>
      api.post('/checkpoints', { ...data, raceId: race.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkpoints', race.id] });
      toast.success('Checkpoint créé.');
      setAddOpen(false);
      reset();
    },
    onError: () => toast.error('Erreur lors de la création.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/checkpoints/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['checkpoints', race.id] }); toast.success('Supprimé.'); },
    onError: () => toast.error('Erreur lors de la suppression.'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ checkpointId, volunteerId }: { checkpointId: string; volunteerId: string }) =>
      api.post(`/checkpoints/${checkpointId}/volunteers/${volunteerId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['checkpoints', race.id] }); toast.success('Bénévole assigné.'); },
    onError: () => toast.error('Erreur d\'assignation.'),
  });

  const unassignMutation = useMutation({
    mutationFn: ({ checkpointId, volunteerId }: { checkpointId: string; volunteerId: string }) =>
      api.delete(`/checkpoints/${checkpointId}/volunteers/${volunteerId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['checkpoints', race.id] }); toast.success('Bénévole retiré.'); },
    onError: () => toast.error('Erreur.'),
  });

  const handleDelete = async (cp: Checkpoint) => {
    const ok = await confirm({ title: 'Supprimer le checkpoint', message: `Supprimer "${cp.name}" ?`, confirmLabel: 'Supprimer' });
    if (ok) deleteMutation.mutate(cp.id);
  };

  const activeCheckpoint = assignOpen ? checkpoints.find((c) => c.id === assignOpen) : null;
  const assignedIds = new Set(activeCheckpoint?.assignments.map((a) => a.volunteerId) ?? []);
  const unassignedVolunteers = volunteers.filter((v) => !assignedIds.has(v.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Checkpoints — {race.name}</h3>
        <Button size="sm" onClick={() => { reset({ type: 'TIMING', order: checkpoints.length + 1 }); setAddOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter
        </Button>
      </div>

      {isLoading && <p className="text-sm text-gray-400">Chargement…</p>}

      <div className="space-y-2">
        {checkpoints.map((cp) => (
          <div key={cp.id} className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 w-5">#{cp.order}</span>
                <span className="font-medium text-gray-800">{cp.name}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[cp.type]}`}>
                  {CHECKPOINT_TYPES.find((t) => t.value === cp.type)?.icon}
                  {CHECKPOINT_TYPES.find((t) => t.value === cp.type)?.label}
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setAssignOpen(cp.id)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  title="Gérer les bénévoles"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(cp)}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {cp.assignments.length > 0 && (
              <div className="flex flex-wrap gap-1 pl-7">
                {cp.assignments.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {a.volunteer.user.name}
                    <button
                      onClick={() => unassignMutation.mutate({ checkpointId: cp.id, volunteerId: a.volunteerId })}
                      className="ml-0.5 text-gray-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {cp.assignments.length === 0 && (
              <p className="pl-7 text-xs text-gray-400 italic">Aucun bénévole assigné</p>
            )}
          </div>
        ))}
        {checkpoints.length === 0 && !isLoading && (
          <p className="text-center text-sm text-gray-400 py-6">Aucun checkpoint. Cliquez sur Ajouter pour commencer.</p>
        )}
      </div>

      {/* Add Checkpoint Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Nouveau checkpoint">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d as CheckpointFormData))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <Input {...register('name')} placeholder="ex: CP1 – Col du Mont" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ordre</label>
              <Input type="number" {...register('order', { valueAsNumber: true })} min={1} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select {...register('type')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                {CHECKPOINT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Heure limite (optionnel)</label>
            <Input type="datetime-local" {...register('cutoffTime')} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending}>Créer</Button>
          </div>
        </form>
      </Modal>

      {/* Assign Volunteer Modal */}
      <Modal open={!!assignOpen} onClose={() => setAssignOpen(null)} title={`Bénévoles — ${activeCheckpoint?.name ?? ''}`}>
        <div className="space-y-3">
          {unassignedVolunteers.length === 0 && (
            <p className="text-sm text-gray-400">Tous les bénévoles de l'événement sont déjà assignés.</p>
          )}
          {unassignedVolunteers.map((v) => (
            <div key={v.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">{v.user?.name}</p>
                <p className="text-xs text-gray-400">{v.user?.email}</p>
              </div>
              <button
                onClick={() => assignMutation.mutate({ checkpointId: assignOpen!, volunteerId: v.id })}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-600 border border-red-200 hover:bg-red-50"
              >
                <UserPlus className="h-3 w-3" /> Assigner
              </button>
            </div>
          ))}

          {activeCheckpoint && activeCheckpoint.assignments.length > 0 && (
            <>
              <hr className="border-gray-100" />
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Déjà assignés</p>
              {activeCheckpoint.assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{a.volunteer.user.name}</p>
                    <p className="text-xs text-gray-400">{a.volunteer.user.email}</p>
                  </div>
                  <button
                    onClick={() => unassignMutation.mutate({ checkpointId: assignOpen!, volunteerId: a.volunteerId })}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                  >
                    <UserMinus className="h-3 w-3" /> Retirer
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
