'use client';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { type Organization } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { Building2, Upload } from 'lucide-react';

const urlOrEmpty = z.string().refine(
  (v) => v === '' || v.startsWith('data:') || z.string().url().safeParse(v).success,
  { message: 'Must be a valid URL' }
);

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  logoUrl: urlOrEmpty.optional(),
  description: z.string().optional(),
  website: urlOrEmpty.optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  facebook: urlOrEmpty.optional(),
  instagram: urlOrEmpty.optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  organization?: Organization;
  onSuccess: () => void;
}

export function OrganizationForm({ organization, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: organization ? {
      name: organization.name,
      logoUrl: organization.logoUrl ?? '',
      description: organization.description ?? '',
      website: organization.website ?? '',
      phone: organization.phone ?? '',
      address: organization.address ?? '',
      facebook: organization.facebook ?? '',
      instagram: organization.instagram ?? '',
    } : undefined,
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const clean = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === '' ? undefined : v])
      );
      return organization
        ? api.patch(`/organizations/${organization.id}`, clean)
        : api.post('/organizations', clean);
    },
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

  const logoUrl = useWatch({ control, name: 'logoUrl' });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setValue('logoUrl', reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div>
        <Label>Organization Name *</Label>
        <Input placeholder="Sports Club Tunisia" {...register('name')} />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div>
        <Label>Logo</Label>
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo preview" className="h-14 w-14 rounded-full object-cover border border-gray-200" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <Building2 className="h-6 w-6" />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Upload className="h-3.5 w-3.5" /> Upload image
            </button>
            {logoUrl && (
              <button type="button" onClick={() => setValue('logoUrl', '')} className="text-xs text-red-500 hover:underline text-left">
                Remove
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <textarea
          className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Brief description of your organization…"
          {...register('description')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Website</Label>
          <Input placeholder="https://yourclub.com" {...register('website')} />
          {errors.website && <p className="mt-1 text-xs text-red-500">{errors.website.message}</p>}
        </div>
        <div>
          <Label>Phone</Label>
          <Input placeholder="+216 xx xxx xxx" {...register('phone')} />
        </div>
      </div>

      <div>
        <Label>Address</Label>
        <Input placeholder="123 Rue de Tunis, Tunis" {...register('address')} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Facebook</Label>
          <Input placeholder="https://facebook.com/yourpage" {...register('facebook')} />
          {errors.facebook && <p className="mt-1 text-xs text-red-500">{errors.facebook.message}</p>}
        </div>
        <div>
          <Label>Instagram</Label>
          <Input placeholder="https://instagram.com/yourpage" {...register('instagram')} />
          {errors.instagram && <p className="mt-1 text-xs text-red-500">{errors.instagram.message}</p>}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : organization ? 'Save Changes' : 'Create Organization'}
        </Button>
      </div>
    </form>
  );
}
