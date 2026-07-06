'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Mail, Send } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import api from '@/lib/api';

const PERMISSIONS = [
  { value: 'CHECK_IN', label: 'Check-in', desc: 'Scanner les dossards au départ' },
  { value: 'BIB_DISTRIBUTION', label: 'Distribution dossards', desc: 'Confirmer l\'arrivée, assigner et distribuer les dossards' },
  { value: 'RAVITO', label: 'Ravitaillement', desc: 'Distribuer nourriture et boissons aux points de ravitaillement' },
  { value: 'MEDAL', label: 'Médailles', desc: 'Remettre les médailles aux finishers à l\'arrivée' },
  { value: 'FINISH_LINE', label: 'Ligne d\'arrivée', desc: 'Enregistrer les temps d\'arrivée' },
  { value: 'MEDICAL', label: 'Médical / Premiers secours', desc: 'Consulter les fiches santé, enregistrer les DNF' },
  { value: 'GAMES', label: 'Jeux (Tombola / Quiz)', desc: 'Animer les jeux pour les participants' },
  { value: 'CHECKPOINT', label: 'Checkpoint', desc: 'Scanner les coureurs aux points de contrôle' },
] as const;

const schema = z.object({
  email: z.string().email('Email invalide'),
  name: z.string().optional(),
  eventId: z.string().min(1, 'Sélectionner un événement'),
  raceId: z.string().optional(),
  permissions: z.array(z.string()).min(1, 'Sélectionner au moins un rôle'),
});
type FormData = z.infer<typeof schema>;

const fieldCls = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-[#FF8C00] focus:ring-2 focus:ring-[#FF8C00]/20 [&>option]:bg-[#1a1a1a]';
const labelCls = 'mb-1.5 block text-sm font-medium text-white/60';

interface Props {
  onSuccess: () => void;
}

export function InviteVolunteerForm({ onSuccess }: Props) {
  const toast = useToast();

  const { data: eventsData } = useQuery({
    queryKey: ['events', 1, ''],
    queryFn: () => api.get('/events', { params: { limit: 100 } }).then((r) => r.data),
  });
  const events = eventsData?.data ?? [];

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { permissions: ['CHECK_IN'] },
  });

  const selectedPerms = watch('permissions');
  const selectedEventId = watch('eventId');

  const { data: racesData } = useQuery({
    queryKey: ['races-for-event', selectedEventId],
    queryFn: () => api.get('/races', { params: { eventId: selectedEventId, limit: 100 } }).then((r) => r.data),
    enabled: !!selectedEventId,
  });
  const races = racesData?.data ?? [];

  const togglePerm = (val: string) => {
    const curr = selectedPerms ?? [];
    setValue(
      'permissions',
      curr.includes(val) ? curr.filter((p) => p !== val) : [...curr, val],
      { shouldValidate: true }
    );
  };

  const onSubmit = async (data: FormData) => {
    try {
      const payload = { ...data, name: data.name || undefined, raceId: data.raceId || undefined };
      await api.post('/volunteers/invite', payload);
      toast.success('Invitation envoyée !');
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Erreur lors de l\'envoi';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-[#FF8C00]/20 bg-[#FF8C00]/8 px-4 py-3">
        <Mail className="h-4 w-4 text-[#FF8C00] mt-0.5 shrink-0" />
        <p className="text-sm text-white/60">Le bénévole recevra un email avec ses identifiants. Si le compte n'existe pas encore, il sera créé automatiquement.</p>
      </div>

      {/* Email */}
      <div>
        <label className={labelCls}>Adresse email</label>
        <input type="email" placeholder="bénévole@exemple.com" className={fieldCls} {...register('email')} />
        {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
      </div>

      {/* Name */}
      <div>
        <label className={labelCls}>Nom <span className="text-white/25">(optionnel — utilisé si un nouveau compte est créé)</span></label>
        <input placeholder="Nom complet" className={fieldCls} {...register('name')} />
      </div>

      {/* Event */}
      <div>
        <label className={labelCls}>Événement</label>
        <select {...register('eventId')} className={fieldCls}>
          <option value="">Sélectionner un événement…</option>
          {events.map((e: { id: string; name: string }) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        {errors.eventId && <p className="mt-1 text-xs text-red-400">{errors.eventId.message}</p>}
      </div>

      {/* Race (conditional) */}
      {selectedEventId && (
        <div>
          <label className={labelCls}>Course <span className="text-white/25">(optionnel — laisser vide pour toutes les courses)</span></label>
          <select {...register('raceId')} className={fieldCls}>
            <option value="">Toutes les courses</option>
            {races.map((r: { id: string; name: string; distance: number }) => (
              <option key={r.id} value={r.id}>{r.name} ({r.distance} km)</option>
            ))}
          </select>
        </div>
      )}

      {/* Permissions */}
      <div>
        <label className={labelCls}>Station / Rôle</label>
        <div className="space-y-2 mt-1">
          {PERMISSIONS.map((p) => {
            const active = selectedPerms?.includes(p.value);
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => togglePerm(p.value)}
                className={`w-full flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                  active
                    ? 'border-[#FF8C00]/40 bg-[#FF8C00]/8'
                    : 'border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5'
                }`}
              >
                <div className={`mt-0.5 h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                  active ? 'border-[#FF8C00] bg-[#FF8C00]' : 'border-white/20'
                }`}>
                  {active && (
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 10">
                      <path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-white/60'}`}>{p.label}</p>
                  <p className="text-xs text-white/30 mt-0.5">{p.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
        {errors.permissions && <p className="mt-1 text-xs text-red-400">{errors.permissions.message}</p>}
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-xl bg-[#FF8C00] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#e67e00] disabled:opacity-60 transition-all hover:scale-[1.02] shadow-lg shadow-[#FF8C00]/20"
        >
          <Send className="h-4 w-4" />
          {isSubmitting ? 'Envoi…' : 'Envoyer l\'invitation'}
        </button>
      </div>
    </form>
  );
}
