'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

type FormData = z.infer<typeof schema>;

interface Organization { id: string; name: string; }

interface Props {
  organization?: Organization;
  onSuccess: () => void;
}

export function OrganizationForm({ organization, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: organization ? { name: organization.name } : undefined,
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      organization
        ? api.patch(`/organizations/${organization.id}`, data)
        : api.post('/organizations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success(organization ? 'Organization updated.' : 'Organization created.');
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
        <Label>Organization Name</Label>
        <Input placeholder="Sports Club Tunisia" {...register('name')} />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : organization ? 'Save Changes' : 'Create Organization'}
        </Button>
      </div>
    </form>
  );
}
