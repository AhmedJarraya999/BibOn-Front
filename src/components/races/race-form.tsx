'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { type Race } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  distance: z.coerce.number().positive('Distance must be positive') as z.ZodNumber,
  startTime: z.string().min(1, 'Start time is required'),
  eventId: z.string().min(1, 'Event is required'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  race?: Race;
  defaultEventId?: string;
  onSuccess: () => void;
}

export function RaceForm({ race, defaultEventId, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: eventsData } = useQuery({
    queryKey: ['events-all'],
    queryFn: () => api.get('/events', { params: { limit: 100 } }).then((r) => r.data),
  });
  const events = eventsData?.data ?? [];

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: race ? {
      name: race.name,
      distance: race.distance,
      startTime: race.startTime.slice(0, 16),
      eventId: race.eventId,
    } : {
      eventId: defaultEventId ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      race
        ? api.patch(`/races/${race.id}`, data)
        : api.post('/races', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['races'] });
      toast.success(race ? 'Race updated.' : 'Race created.');
      onSuccess();
    },
    onError: () => toast.error('Something went wrong.'),
  });

  const onSubmit = (data: FormData) => mutation.mutate(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>Race Name</Label>
        <Input placeholder="10K Run" {...register('name')} />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div>
        <Label>Distance (km)</Label>
        <Input type="number" step="0.1" placeholder="10" {...register('distance')} />
        {errors.distance && <p className="mt-1 text-xs text-red-500">{errors.distance.message}</p>}
      </div>

      <div>
        <Label>Start Time</Label>
        <Input type="datetime-local" {...register('startTime')} />
        {errors.startTime && <p className="mt-1 text-xs text-red-500">{errors.startTime.message}</p>}
      </div>

      <div>
        <Label>Event</Label>
        <select
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...register('eventId')}
        >
          <option value="">Select event…</option>
          {events.map((e: { id: string; name: string }) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        {errors.eventId && <p className="mt-1 text-xs text-red-500">{errors.eventId.message}</p>}
      </div>

      {mutation.isError && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">Something went wrong. Please try again.</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : race ? 'Save Changes' : 'Create Race'}
        </Button>
      </div>
    </form>
  );
}
