'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Mail, Send } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOrg } from '@/lib/org-context';

const PERMISSIONS = [
  { value: 'CHECK_IN', label: 'Check-in', desc: 'Scan bibs at the start line' },
  { value: 'CHECKPOINT', label: 'Checkpoint', desc: 'Scan runners at control points' },
  { value: 'DISTRIBUTION', label: 'Distribution', desc: 'Hand out medals, bibs, t-shirts' },
  { value: 'FINISH_LINE', label: 'Finish line', desc: 'Record finish times' },
] as const;

const schema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().optional(),
  eventId: z.string().min(1, 'Select an event'),
  permissions: z.array(z.string()).min(1, 'Select at least one role'),
});
type FormData = z.infer<typeof schema>;

interface Props {
  onSuccess: () => void;
}

export function InviteVolunteerForm({ onSuccess }: Props) {
  const { activeOrg } = useOrg();
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
      const payload = { ...data, name: data.name || undefined };
      await api.post('/volunteers/invite', payload);
      toast.success('Invitation sent successfully!');
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to send invitation';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
        <Mail className="h-4 w-4 mt-0.5 shrink-0" />
        <span>The volunteer will receive an email with their login credentials. If they don't have an account yet, one will be created automatically.</span>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
        <Input type="email" placeholder="volunteer@example.com" {...register('email')} />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-gray-400">(optional — used if a new account is created)</span></label>
        <Input placeholder="Full name" {...register('name')} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Event</label>
        <select
          {...register('eventId')}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">Select an event…</option>
          {events.map((e: { id: string; name: string }) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        {errors.eventId && <p className="text-xs text-red-500 mt-1">{errors.eventId.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Station / Role</label>
        <div className="space-y-2">
          {PERMISSIONS.map((p) => {
            const active = selectedPerms?.includes(p.value);
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => togglePerm(p.value)}
                className={`w-full flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                  active
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`mt-0.5 h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center ${
                  active ? 'border-red-500 bg-red-500' : 'border-gray-300'
                }`}>
                  {active && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
                <div>
                  <p className={`text-sm font-medium ${active ? 'text-red-700' : 'text-gray-800'}`}>{p.label}</p>
                  <p className="text-xs text-gray-400">{p.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
        {errors.permissions && <p className="text-xs text-red-500 mt-1">{errors.permissions.message}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          <Send className="h-4 w-4" />
          {isSubmitting ? 'Sending…' : 'Send Invitation'}
        </Button>
      </div>
    </form>
  );
}
