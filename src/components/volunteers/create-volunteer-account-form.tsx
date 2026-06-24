'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSuccess: () => void;
}

export function CreateVolunteerAccountForm({ onSuccess }: Props) {
  const toast = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      api.post('/auth/register', { ...data, role: 'VOLUNTEER' }),
    onSuccess: () => {
      toast.success('Volunteer account created. They can now log in.');
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Could not create account.');
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <p className="text-sm text-gray-500">
        Creates a login account with the Volunteer role. After creation, assign them to an event using "Assign to Event".
      </p>

      <div>
        <Label>Full Name</Label>
        <Input placeholder="Jane Doe" {...register('name')} />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div>
        <Label>Email</Label>
        <Input type="email" placeholder="jane@example.com" {...register('email')} />
        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
      </div>

      <div>
        <Label>Password</Label>
        <Input type="password" placeholder="Min. 8 characters" {...register('password')} />
        {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
      </div>

      {mutation.isError && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">
          {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Something went wrong.'}
        </p>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating…' : 'Create Account'}
        </Button>
      </div>
    </form>
  );
}
