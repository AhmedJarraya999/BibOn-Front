'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { type Race } from '@/types';
import { useToast } from '@/components/ui/toast';

const schema = z.object({
  name: z.string().min(2, 'Le nom doit comporter au moins 2 caractères'),
  distance: z.coerce.number().positive('La distance doit être positive') as z.ZodNumber,
  startTime: z.string().min(1, "L'heure de départ est requise"),
  fee: z.coerce.number().min(0, 'Le frais doit être ≥ 0') as z.ZodNumber,
  eventId: z.string().min(1, 'Sélectionner un événement'),
});

type FormData = z.infer<typeof schema>;

const F = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-[#FF8C00] focus:ring-2 focus:ring-[#FF8C00]/20 [color-scheme:dark]';
const L = 'mb-1.5 block text-sm font-medium text-white/60';

interface Props {
  race?: Race;
  defaultEventId?: string;
  onSuccess: () => void;
}

export function RaceForm({ race, defaultEventId, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: eventsData } = useQuery({
    queryKey: ['events', 1, ''],
    queryFn: () => api.get('/events', { params: { limit: 100 } }).then((r) => r.data),
    enabled: !defaultEventId,
  });
  const events = eventsData?.data ?? [];

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: race ? {
      name: race.name,
      distance: race.distance,
      startTime: race.startTime?.slice(0, 16),
      fee: Number(race.fee ?? 0),
      eventId: race.eventId,
    } : {
      eventId: defaultEventId ?? '',
      fee: 0,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      race ? api.patch(`/races/${race.id}`, data) : api.post('/races', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['races'] });
      toast.success(race ? 'Course mise à jour.' : 'Course créée !');
      onSuccess();
    },
    onError: () => toast.error('Une erreur est survenue.'),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div>
        <label className={L}>Nom de la course</label>
        <input placeholder="10K Run" className={F} {...register('name')} />
        {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
      </div>

      <div>
        <label className={L}>Distance (km)</label>
        <input type="number" step="0.1" placeholder="10" className={F} {...register('distance')} />
        {errors.distance && <p className="mt-1 text-xs text-red-400">{errors.distance.message}</p>}
      </div>

      <div>
        <label className={L}>Frais de participation (TND)</label>
        <input type="number" step="0.001" min="0" placeholder="0.000" className={F} {...register('fee')} />
        {errors.fee && <p className="mt-1 text-xs text-red-400">{errors.fee.message}</p>}
      </div>

      <div>
        <label className={L}>Heure de départ</label>
        <input type="datetime-local" className={F} {...register('startTime')} />
        {errors.startTime && <p className="mt-1 text-xs text-red-400">{errors.startTime.message}</p>}
      </div>

      {!defaultEventId && (
        <div>
          <label className={L}>Événement</label>
          <select className={`${F} [&>option]:bg-[#1a1a1a]`} {...register('eventId')}>
            <option value="">Sélectionner un événement…</option>
            {events.map((e: { id: string; name: string }) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          {errors.eventId && <p className="mt-1 text-xs text-red-400">{errors.eventId.message}</p>}
        </div>
      )}

      {mutation.isError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Une erreur est survenue. Veuillez réessayer.
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={mutation.isPending || isSubmitting}
          className="flex items-center gap-2 rounded-xl bg-[#FF8C00] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#e67e00] disabled:opacity-60 transition-all hover:scale-[1.02] shadow-lg shadow-[#FF8C00]/20">
          {mutation.isPending ? 'Enregistrement…' : race ? 'Enregistrer' : 'Créer la course'}
        </button>
      </div>
    </form>
  );
}
