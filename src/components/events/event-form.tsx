'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { type Event } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  location: z.string().min(2, 'Location is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  organizationId: z.string().min(1, 'Organization is required'),
}).refine((d) => d.endDate >= d.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

type FormData = z.infer<typeof schema>;

interface Props {
  event?: Event;
  onSuccess: () => void;
}

export function EventForm({ event, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: orgsData } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api.get('/organizations').then((r) => r.data),
  });
  const organizations = orgsData?.data ?? orgsData ?? [];

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: event ? {
      name: event.name,
      location: event.location,
      startDate: event.startDate.slice(0, 10),
      endDate: event.endDate.slice(0, 10),
      organizationId: event.organizationId,
    } : undefined,
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      event
        ? api.patch(`/events/${event.id}`, data)
        : api.post('/events', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(event ? 'Event updated.' : 'Event created.');
      onSuccess();
    },
    onError: () => toast.error('Something went wrong.'),
  });

  const onSubmit = (data: FormData) => mutation.mutate(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>Event Name</Label>
        <Input placeholder="Marathon 2026" {...register('name')} />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div>
        <Label>Location</Label>
        <Input placeholder="Tunis, Tunisia" {...register('location')} />
        {errors.location && <p className="mt-1 text-xs text-red-500">{errors.location.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start Date</Label>
          <Input type="date" {...register('startDate')} />
          {errors.startDate && <p className="mt-1 text-xs text-red-500">{errors.startDate.message}</p>}
        </div>
        <div>
          <Label>End Date</Label>
          <Input type="date" {...register('endDate')} />
          {errors.endDate && <p className="mt-1 text-xs text-red-500">{errors.endDate.message}</p>}
        </div>
      </div>

      <div>
        <Label>Organization</Label>
        <select
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...register('organizationId')}
        >
          <option value="">Select organization…</option>
          {organizations.map((org: { id: string; name: string }) => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
        {errors.organizationId && <p className="mt-1 text-xs text-red-500">{errors.organizationId.message}</p>}
      </div>

      {mutation.isError && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">Something went wrong. Please try again.</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting || mutation.isPending}>
          {mutation.isPending ? 'Saving…' : event ? 'Save Changes' : 'Create Event'}
        </Button>
      </div>
    </form>
  );
}
