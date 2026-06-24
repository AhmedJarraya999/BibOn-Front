'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { type Participant } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';

const schema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  birthdate: z.string().min(1, 'Birthdate is required'),
  gender: z.enum(['M', 'F'], { error: 'Gender is required' }),
});

type FormData = z.infer<typeof schema>;

interface Props {
  participant?: Participant;
  onSuccess: () => void;
}

export function ParticipantForm({ participant, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: participant ? {
      fullName: participant.fullName,
      email: participant.email,
      birthdate: participant.birthdate.slice(0, 10),
      gender: participant.gender as 'M' | 'F',
    } : undefined,
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      participant
        ? api.patch(`/participants/${participant.id}`, data)
        : api.post('/participants', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
      toast.success(participant ? 'Participant updated.' : 'Participant created.');
      onSuccess();
    },
    onError: () => toast.error('Something went wrong.'),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div>
        <Label>Full Name</Label>
        <Input placeholder="Ahmed Ben Salem" {...register('fullName')} />
        {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>}
      </div>

      <div>
        <Label>Email</Label>
        <Input type="email" placeholder="ahmed@example.com" {...register('email')} />
        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Birthdate</Label>
          <Input type="date" {...register('birthdate')} />
          {errors.birthdate && <p className="mt-1 text-xs text-red-500">{errors.birthdate.message}</p>}
        </div>
        <div>
          <Label>Gender</Label>
          <select
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...register('gender')}
          >
            <option value="">Select…</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
          {errors.gender && <p className="mt-1 text-xs text-red-500">{errors.gender.message}</p>}
        </div>
      </div>

      {mutation.isError && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">Something went wrong. Please try again.</p>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : participant ? 'Save Changes' : 'Create Participant'}
        </Button>
      </div>
    </form>
  );
}
