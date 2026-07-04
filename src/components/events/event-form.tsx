'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Plus, X } from 'lucide-react';
import api from '@/lib/api';
import { type Event } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useOrg } from '@/lib/org-context';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  location: z.string().min(2, 'Location is required'),
  date: z.string().min(1, 'Date is required'),
  paymentMode: z.enum(['PREPAID_ONLY', 'PREPAID_OR_ONSITE']),
  logoUrl: z.string().optional(),
  pickupLocations: z.array(z.string()).optional(),
  organizationId: z.string().min(1, 'Organization is required'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  event?: Event;
  onSuccess: () => void;
}

export function EventForm({ event, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { activeOrg } = useOrg();
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(event?.logoUrl ?? null);
  const [pickupLocations, setPickupLocations] = useState<string[]>((event as any)?.pickupLocations ?? []);
  const [pickupInput, setPickupInput] = useState('');

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: event ? {
      name: event.name,
      location: event.location,
      date: event.date?.slice(0, 10),
      paymentMode: (event.paymentMode as 'PREPAID_ONLY' | 'PREPAID_OR_ONSITE') ?? 'PREPAID_OR_ONSITE',
      logoUrl: event.logoUrl,
      organizationId: event.organizationId,
    } : {
      paymentMode: 'PREPAID_OR_ONSITE' as const,
      organizationId: activeOrg?.id ?? '',
    },
  });

  useEffect(() => {
    if (!event && activeOrg?.id) setValue('organizationId', activeOrg.id);
  }, [activeOrg?.id, event, setValue]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoPreview(dataUrl);
      setValue('logoUrl', dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setLogoPreview(null);
    setValue('logoUrl', undefined);
    if (fileRef.current) fileRef.current.value = '';
  }

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

  function addPickupLocation() {
    const val = pickupInput.trim();
    if (!val || pickupLocations.includes(val)) return;
    const updated = [...pickupLocations, val];
    setPickupLocations(updated);
    setValue('pickupLocations', updated);
    setPickupInput('');
  }

  function removePickupLocation(loc: string) {
    const updated = pickupLocations.filter((l) => l !== loc);
    setPickupLocations(updated);
    setValue('pickupLocations', updated);
  }

  const onSubmit = (data: FormData) => mutation.mutate({ ...data, pickupLocations });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>Event Logo</Label>
        <div className="mt-1 flex items-center gap-4">
          {logoPreview ? (
            <div className="relative h-20 w-20 flex-shrink-0">
              <img src={logoPreview} alt="Event logo" className="h-20 w-20 rounded-lg object-cover border border-gray-200" />
              <button
                type="button"
                onClick={removeLogo}
                className="absolute -right-2 -top-2 rounded-full bg-white border border-gray-200 p-0.5 text-gray-500 hover:text-red-500 shadow-sm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <ImagePlus className="h-7 w-7 text-gray-300" />
            </div>
          )}
          <div className="text-sm text-gray-500">
            <button type="button" onClick={() => fileRef.current?.click()} className="text-blue-600 hover:underline">
              {logoPreview ? 'Change logo' : 'Upload logo'}
            </button>
            <p className="mt-0.5 text-xs text-gray-400">PNG, JPG up to 5 MB</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
        </div>
      </div>

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

      <div>
        <Label>Date</Label>
        <Input type="date" {...register('date')} />
        {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>}
      </div>

      <div>
        <Label>Payment Mode</Label>
        <select
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...register('paymentMode')}
        >
          <option value="PREPAID_OR_ONSITE">Online or On-site payment</option>
          <option value="PREPAID_ONLY">Online payment only</option>
        </select>
        {errors.paymentMode && <p className="mt-1 text-xs text-red-500">{errors.paymentMode.message}</p>}
      </div>

      <div>
        <Label>Pickup Locations (Lieux de retrait)</Label>
        <div className="mt-1 space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Tunis centre, La Marsa…"
              value={pickupInput}
              onChange={(e) => setPickupInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPickupLocation(); } }}
            />
            <Button type="button" variant="outline" onClick={addPickupLocation} disabled={!pickupInput.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {pickupLocations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pickupLocations.map((loc) => (
                <span key={loc} className="flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-sm text-blue-700">
                  {loc}
                  <button type="button" onClick={() => removePickupLocation(loc)} className="text-blue-400 hover:text-blue-600">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400">Press Enter or + to add each location. Participants will choose one during registration.</p>
        </div>
      </div>

      <div>
        <Label>Organization</Label>
        {activeOrg ? (
          <div className="flex h-10 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700">
            {activeOrg.name}
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Chargement de l'organisation…
          </div>
        )}
        <input type="hidden" {...register('organizationId')} />
        {errors.organizationId && <p className="mt-1 text-xs text-red-500">{errors.organizationId.message}</p>}
      </div>

      {mutation.isError && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">Something went wrong. Please try again.</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting || mutation.isPending || (!event && !activeOrg)}>
          {mutation.isPending ? 'Saving…' : event ? 'Save Changes' : 'Create Event'}
        </Button>
      </div>
    </form>
  );
}
