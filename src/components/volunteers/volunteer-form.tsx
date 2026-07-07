'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { type Volunteer } from '@/types';
import { useToast } from '@/components/ui/toast';
import { Shield } from 'lucide-react';

const PERMISSIONS = [
  { value: 'CHECK_IN', label: 'Check-in', desc: 'Scanner les dossards au départ' },
  { value: 'BIB_DISTRIBUTION', label: 'Distribution dossards', desc: 'Assigner et distribuer les dossards' },
  { value: 'RAVITO', label: 'Ravitaillement', desc: 'Distribuer nourriture et boissons' },
  { value: 'MEDAL', label: 'Médailles', desc: 'Remettre les médailles aux finishers' },
  { value: 'FINISH', label: 'Ligne d\'arrivée', desc: 'Enregistrer les temps d\'arrivée' },
  { value: 'MEDICAL', label: 'Médical', desc: 'Consulter les fiches santé, DNF' },
  { value: 'GAMES', label: 'Jeux', desc: 'Animer les jeux pour les participants' },
  { value: 'DISQUALIFY', label: 'Disqualifier', desc: 'Marquer un coureur comme disqualifié' },
] as const;

const schema = z.object({
  userId: z.string().min(1, 'Utilisateur requis'),
  eventId: z.string().min(1, 'Événement requis'),
  permissions: z.array(z.string()).min(1, 'Sélectionner au moins un rôle'),
});

type FormData = z.infer<typeof schema>;

const F = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-[#FF8C00] focus:ring-2 focus:ring-[#FF8C00]/20 [&>option]:bg-[#1a1a1a]';
const L = 'mb-1.5 block text-sm font-medium text-white/60';

interface Props {
  volunteer?: Volunteer;
  onSuccess: () => void;
}

export function VolunteerForm({ volunteer, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: usersData } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => api.get('/users', { params: { role: 'VOLUNTEER' } }).then((r) => r.data),
    enabled: !volunteer,
  });
  const { data: eventsData } = useQuery({
    queryKey: ['events-all'],
    queryFn: () => api.get('/events', { params: { limit: 100 } }).then((r) => r.data),
    enabled: !volunteer,
  });

  const users = usersData?.data ?? usersData ?? [];
  const events = eventsData?.data ?? [];

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: volunteer
      ? { userId: volunteer.userId, eventId: volunteer.eventId, permissions: volunteer.permissions }
      : { permissions: [] },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      volunteer
        ? api.patch(`/volunteers/${volunteer.id}`, { permissions: data.permissions })
        : api.post('/volunteers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['volunteers'] });
      toast.success(volunteer ? 'Permissions mises à jour.' : 'Bénévole ajouté.');
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Une erreur est survenue.');
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      {!volunteer && (
        <>
          <div>
            <label className={L}>Utilisateur</label>
            <select className={F} {...register('userId')}>
              <option value="">Sélectionner un utilisateur…</option>
              {users.map((u: { id: string; name: string; email: string }) => (
                <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
              ))}
            </select>
            {errors.userId && <p className="mt-1 text-xs text-red-400">{errors.userId.message}</p>}
          </div>

          <div>
            <label className={L}>Événement</label>
            <select className={F} {...register('eventId')}>
              <option value="">Sélectionner un événement…</option>
              {events.map((e: { id: string; name: string }) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            {errors.eventId && <p className="mt-1 text-xs text-red-400">{errors.eventId.message}</p>}
          </div>
        </>
      )}

      <div>
        <label className={L}>Rôles / Permissions</label>
        <Controller
          name="permissions"
          control={control}
          render={({ field }) => (
            <div className="mt-1 space-y-2">
              {PERMISSIONS.map((perm) => {
                const active = field.value.includes(perm.value);
                return (
                  <button key={perm.value} type="button"
                    onClick={() => {
                      const next = active
                        ? field.value.filter((p) => p !== perm.value)
                        : [...field.value, perm.value];
                      field.onChange(next);
                    }}
                    className={`w-full flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                      active ? 'border-[#FF8C00]/40 bg-[#FF8C00]/8' : 'border-white/8 bg-white/3 hover:border-white/15'
                    }`}>
                    <div className={`mt-0.5 h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                      active ? 'border-[#FF8C00] bg-[#FF8C00]' : 'border-white/20'
                    }`}>
                      {active && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-white/60'}`}>{perm.label}</p>
                      <p className="text-xs text-white/30 mt-0.5">{perm.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        />
        {errors.permissions && <p className="mt-1 text-xs text-red-400">{errors.permissions.message}</p>}
      </div>

      {mutation.isError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Une erreur est survenue.'}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={mutation.isPending}
          className="rounded-xl bg-[#FF8C00] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#e67e00] disabled:opacity-60 transition-all hover:scale-[1.02] shadow-lg shadow-[#FF8C00]/20">
          {mutation.isPending ? 'Enregistrement…' : volunteer ? 'Enregistrer' : 'Ajouter le bénévole'}
        </button>
      </div>
    </form>
  );
}
