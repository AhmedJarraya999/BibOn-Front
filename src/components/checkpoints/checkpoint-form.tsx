'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/components/ui/toast';

const CHECKPOINT_TYPES = [
  { value: 'TIMING',        label: 'Timing',               emoji: '⏱' },
  { value: 'EAU',           label: 'Point d\'eau',         emoji: '💧' },
  { value: 'RAVITO',        label: 'Ravitaillement',       emoji: '🥤' },
  { value: 'TIMING_RAVITO', label: 'Timing + Ravito',      emoji: '⏱🥤' },
] as const;

const schema = z.object({
  name: z.string().min(1, 'Nom requis'),
  order: z.coerce.number().int().min(1, 'Ordre requis') as z.ZodNumber,
  type: z.enum(['TIMING', 'EAU', 'RAVITO', 'TIMING_RAVITO']),
  cutoffTime: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const F = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-[#FF8C00] focus:ring-2 focus:ring-[#FF8C00]/20 [color-scheme:dark] [&>option]:bg-[#1a1a1a]';
const L = 'mb-1.5 block text-sm font-medium text-white/60';

interface Checkpoint {
  id: string;
  name: string;
  order: number;
  type: string;
  cutoffTime?: string | null;
  raceId: string;
}

interface Props {
  raceId: string;
  checkpoint?: Checkpoint;
  nextOrder?: number;
  onSuccess: () => void;
}

export function CheckpointForm({ raceId, checkpoint, nextOrder = 1, onSuccess }: Props) {
  const qc = useQueryClient();
  const toast = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: checkpoint
      ? {
          name: checkpoint.name,
          order: checkpoint.order,
          type: checkpoint.type as FormData['type'],
          cutoffTime: checkpoint.cutoffTime ? new Date(checkpoint.cutoffTime).toISOString().slice(0, 16) : '',
        }
      : { type: 'TIMING', order: nextOrder },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        raceId,
        name: data.name,
        order: data.order,
        type: data.type,
        cutoffTime: data.cutoffTime || undefined,
        latitude: undefined,
        longitude: undefined,
        items: [],
      };
      return checkpoint
        ? api.patch(`/checkpoints/${checkpoint.id}`, payload)
        : api.post('/checkpoints', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkpoints', raceId] });
      toast.success(checkpoint ? 'Checkpoint mis à jour.' : 'Checkpoint ajouté.');
      onSuccess();
    },
    onError: () => toast.error('Une erreur est survenue.'),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div>
        <label className={L}>Nom du checkpoint</label>
        <input placeholder="ex. CP Forêt, Ravito Colline…" className={F} {...register('name')} />
        {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={L}>Ordre</label>
          <input type="number" min={1} className={F} {...register('order')} />
          {errors.order && <p className="mt-1 text-xs text-red-400">{errors.order.message}</p>}
        </div>
        <div>
          <label className={L}>Type</label>
          <select className={F} {...register('type')}>
            {CHECKPOINT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={L}>Heure limite (cutoff) <span className="text-white/25">— optionnel</span></label>
        <input type="datetime-local" className={F} {...register('cutoffTime')} />
      </div>

      {mutation.isError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Une erreur est survenue. Veuillez réessayer.
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={mutation.isPending}
          className="rounded-xl bg-[#FF8C00] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#e67e00] disabled:opacity-60 transition-all hover:scale-[1.02] shadow-lg shadow-[#FF8C00]/20">
          {mutation.isPending ? 'Enregistrement…' : checkpoint ? 'Enregistrer' : 'Ajouter le checkpoint'}
        </button>
      </div>
    </form>
  );
}
