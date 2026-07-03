'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { type Volunteer } from '@/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';

const PERMISSIONS = [
  { value: 'CHECK_IN', label: 'Check-in' },
  { value: 'BIB_DISTRIBUTION', label: 'Bib distribution' },
  { value: 'RAVITO', label: 'Ravito station' },
  { value: 'MEDAL', label: 'Medal distribution' },
  { value: 'FINISH', label: 'Finish line' },
  { value: 'DISQUALIFY', label: 'Disqualify' },
] as const;

const schema = z.object({
  userId: z.string().min(1, 'User is required'),
  eventId: z.string().min(1, 'Event is required'),
  permissions: z.array(z.string()).min(1, 'Select at least one permission'),
});

type FormData = z.infer<typeof schema>;

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
  });

  const { data: eventsData } = useQuery({
    queryKey: ['events-all'],
    queryFn: () => api.get('/events', { params: { limit: 100 } }).then((r) => r.data),
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
      toast.success(volunteer ? 'Permissions updated.' : 'Volunteer added.');
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Something went wrong.');
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div>
        <Label>User</Label>
        <select
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          disabled={!!volunteer}
          {...register('userId')}
        >
          <option value="">Select user…</option>
          {users.map((u: { id: string; name: string; email: string }) => (
            <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
          ))}
        </select>
        {errors.userId && <p className="mt-1 text-xs text-red-500">{errors.userId.message}</p>}
      </div>

      <div>
        <Label>Event</Label>
        <select
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          disabled={!!volunteer}
          {...register('eventId')}
        >
          <option value="">Select event…</option>
          {events.map((e: { id: string; name: string }) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        {errors.eventId && <p className="mt-1 text-xs text-red-500">{errors.eventId.message}</p>}
      </div>

      <div>
        <Label>Permissions</Label>
        <Controller
          name="permissions"
          control={control}
          render={({ field }) => (
            <div className="mt-1 space-y-2">
              {PERMISSIONS.map((perm) => (
                <label key={perm.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={field.value.includes(perm.value)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...field.value, perm.value]
                        : field.value.filter((p) => p !== perm.value);
                      field.onChange(next);
                    }}
                  />
                  <span className="text-sm text-gray-700">{perm.label}</span>
                </label>
              ))}
            </div>
          )}
        />
        {errors.permissions && <p className="mt-1 text-xs text-red-500">{errors.permissions.message}</p>}
      </div>

      {mutation.isError && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">
          {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Something went wrong.'}
        </p>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : volunteer ? 'Save Changes' : 'Add Volunteer'}
        </Button>
      </div>
    </form>
  );
}
