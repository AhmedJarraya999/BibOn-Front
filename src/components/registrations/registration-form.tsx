'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/components/ui/toast';

const schema = z.object({
  participantId: z.string().min(1, 'Participant requis'),
  raceId: z.string().min(1, 'Course requise'),
  bibNumber: z.string().min(1, 'Numéro de dossard requis'),
});

type FormData = z.infer<typeof schema>;

const F = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-[#FF8C00] focus:ring-2 focus:ring-[#FF8C00]/20 [&>option]:bg-[#1a1a1a]';
const L = 'mb-1.5 block text-sm font-medium text-white/60';

interface Props { onSuccess: () => void; }

export function RegistrationForm({ onSuccess }: Props) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: participantsData } = useQuery({
    queryKey: ['participants-all'],
    queryFn: () => api.get('/participants', { params: { limit: 200 } }).then((r) => r.data),
  });
  const { data: racesData } = useQuery({
    queryKey: ['races-all'],
    queryFn: () => api.get('/races', { params: { limit: 200 } }).then((r) => r.data),
  });

  const participants = participantsData?.data ?? [];
  const races = racesData?.data ?? [];

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.post('/registrations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      toast.success('Participant inscrit !');
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Erreur lors de l\'inscription.');
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div>
        <label className={L}>Participant</label>
        <select className={F} {...register('participantId')}>
          <option value="">Sélectionner un participant…</option>
          {participants.map((p: { id: string; fullName: string; email: string }) => (
            <option key={p.id} value={p.id}>{p.fullName} — {p.email}</option>
          ))}
        </select>
        {errors.participantId && <p className="mt-1 text-xs text-red-400">{errors.participantId.message}</p>}
      </div>

      <div>
        <label className={L}>Course</label>
        <select className={F} {...register('raceId')}>
          <option value="">Sélectionner une course…</option>
          {races.map((r: { id: string; name: string; distance: number }) => (
            <option key={r.id} value={r.id}>{r.name} ({r.distance} km)</option>
          ))}
        </select>
        {errors.raceId && <p className="mt-1 text-xs text-red-400">{errors.raceId.message}</p>}
      </div>

      <div>
        <label className={L}>Numéro de dossard</label>
        <input placeholder="ex. 42" className={F} {...register('bibNumber')} />
        {errors.bibNumber && <p className="mt-1 text-xs text-red-400">{errors.bibNumber.message}</p>}
      </div>

      {mutation.isError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Une erreur est survenue.'}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={mutation.isPending}
          className="rounded-xl bg-[#FF8C00] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#e67e00] disabled:opacity-60 transition-all hover:scale-[1.02] shadow-lg shadow-[#FF8C00]/20">
          {mutation.isPending ? 'Inscription…' : 'Inscrire le participant'}
        </button>
      </div>
    </form>
  );
}
