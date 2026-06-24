'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';

const schema = z.object({
  participantId: z.string().min(1, 'Participant is required'),
  raceId: z.string().min(1, 'Race is required'),
  bibNumber: z.string().min(1, 'Bib number is required'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSuccess: () => void;
}

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
      toast.success('Participant registered.');
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Registration failed.');
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div>
        <Label>Participant</Label>
        <select
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...register('participantId')}
        >
          <option value="">Select participant…</option>
          {participants.map((p: { id: string; fullName: string; email: string }) => (
            <option key={p.id} value={p.id}>{p.fullName} — {p.email}</option>
          ))}
        </select>
        {errors.participantId && <p className="mt-1 text-xs text-red-500">{errors.participantId.message}</p>}
      </div>

      <div>
        <Label>Race</Label>
        <select
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...register('raceId')}
        >
          <option value="">Select race…</option>
          {races.map((r: { id: string; name: string; distance: number }) => (
            <option key={r.id} value={r.id}>{r.name} ({r.distance} km)</option>
          ))}
        </select>
        {errors.raceId && <p className="mt-1 text-xs text-red-500">{errors.raceId.message}</p>}
      </div>

      <div>
        <Label>Bib Number</Label>
        <Input placeholder="e.g. 42" {...register('bibNumber')} />
        {errors.bibNumber && <p className="mt-1 text-xs text-red-500">{errors.bibNumber.message}</p>}
      </div>

      {mutation.isError && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">
          {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Something went wrong.'}
        </p>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Registering…' : 'Register Participant'}
        </Button>
      </div>
    </form>
  );
}
