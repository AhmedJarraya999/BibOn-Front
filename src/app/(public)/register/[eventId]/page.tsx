'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, CreditCard, Banknote } from 'lucide-react';
import axios from 'axios';
import { type Event, type Race } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002/api';
const publicApi = axios.create({ baseURL: BASE_URL });

const schema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email'),
  birthdate: z.string().min(1, 'Birthdate is required'),
  gender: z.enum(['M', 'F'], { message: 'Gender is required' }),
  phone: z.string().optional(),
  country: z.string().optional(),
  raceId: z.string().min(1, 'Please select a race'),
  lieuDeRetrait: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function PublicRegisterPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [registered, setRegistered] = useState<{ registrationId: string; paymentMode: string; fee: number } | null>(null);
  const [payingOnline, setPayingOnline] = useState(false);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['public-event', eventId],
    queryFn: () => publicApi.get(`/events/${eventId}`).then((r) => r.data),
  });

  const { data: racesData } = useQuery({
    queryKey: ['public-races', event?.id],
    queryFn: () => publicApi.get('/races', { params: { eventId: event?.id, limit: 50 } }).then((r) => r.data),
    enabled: !!event?.id,
  });
  const races: Race[] = racesData?.data ?? [];

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const selectedRaceId = watch('raceId');
  const selectedRace = races.find((r) => r.id === selectedRaceId);

  const registerMutation = useMutation({
    mutationFn: (data: FormData) => publicApi.post('/registrations/public', data),
    onSuccess: (res, data) => {
      const race = races.find((r) => r.id === data.raceId);
      setRegistered({
        registrationId: res.data.registration.id,
        paymentMode: event?.paymentMode ?? 'PREPAID_OR_ONSITE',
        fee: Number(race?.fee ?? 0),
      });
    },
  });

  const payOnlineMutation = useMutation({
    mutationFn: (registrationId: string) =>
      publicApi.post(`/payments/initiate/${registrationId}`, {
        successUrl: `${window.location.origin}/register/success?registrationId=${registrationId}`,
        failUrl: `${window.location.origin}/register/cancel`,
      }),
    onSuccess: (res) => {
      window.location.href = res.data.paymentUrl;
    },
  });

  if (eventLoading) return <div className="flex min-h-screen items-center justify-center text-gray-500">Loading…</div>;
  if (!event) return <div className="flex min-h-screen items-center justify-center text-red-500">Event not found.</div>;

  const eventData: Event = event;

  if (registered) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center space-y-6">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pre-registration Confirmed!</h1>
            <p className="mt-2 text-gray-500">
              Your spot is reserved. Complete payment to confirm your registration.
            </p>
          </div>

          {registered.fee > 0 ? (
            <div className="space-y-3">
              <p className="font-semibold text-gray-700">
                Amount due: <span className="text-blue-600">{registered.fee.toFixed(3)} TND</span>
              </p>

              <Button
                className="w-full"
                onClick={() => { setPayingOnline(true); payOnlineMutation.mutate(registered.registrationId); }}
                disabled={payingOnline || payOnlineMutation.isPending}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {payingOnline ? 'Redirecting to Flouci…' : 'Pay Online with Flouci'}
              </Button>

              {eventData.paymentMode === 'PREPAID_OR_ONSITE' && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-left">
                  <div className="flex items-center gap-2 text-amber-700 font-medium mb-1">
                    <Banknote className="h-4 w-4" />
                    Pay on-site at bib distribution
                  </div>
                  <p className="text-sm text-amber-600">
                    You can also pay in cash when you pick up your bib kit at the event.
                    Show this confirmation to the volunteer.
                  </p>
                  <p className="mt-2 text-xs font-mono text-amber-800 bg-amber-100 rounded px-2 py-1">
                    Registration ID: {registered.registrationId}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-green-600 font-medium">This race is free — your registration is confirmed!</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">{eventData.name}</h1>
          <p className="mt-1 text-gray-500">{eventData.location}</p>
        </div>

        {/* Race picker */}
        <div className="mb-6 grid gap-3">
          {races.map((race) => (
            <label
              key={race.id}
              className={`flex items-center justify-between rounded-xl border-2 p-4 cursor-pointer transition-colors ${
                selectedRaceId === race.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input type="radio" value={race.id} {...register('raceId')} className="sr-only" />
              <div>
                <p className="font-semibold text-gray-900">{race.name}</p>
                <p className="text-sm text-gray-500">{race.distance} km</p>
              </div>
              <span className="text-lg font-bold text-blue-600">
                {Number(race.fee) > 0 ? `${Number(race.fee).toFixed(3)} TND` : 'Free'}
              </span>
            </label>
          ))}
          {errors.raceId && <p className="text-xs text-red-500">{errors.raceId.message}</p>}
        </div>

        <form onSubmit={handleSubmit((d) => registerMutation.mutate(d))} className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Information</h2>

          <div>
            <Label>Full Name</Label>
            <Input placeholder="Ahmed Jarraya" {...register('fullName')} />
            {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>}
          </div>

          <div>
            <Label>Email</Label>
            <Input type="email" placeholder="ahmed@example.com" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" {...register('birthdate')} />
              {errors.birthdate && <p className="mt-1 text-xs text-red-500">{errors.birthdate.message}</p>}
            </div>
            <div>
              <Label>Gender</Label>
              <select className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register('gender')}>
                <option value="">Select…</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
              {errors.gender && <p className="mt-1 text-xs text-red-500">{errors.gender.message}</p>}
            </div>
          </div>

          <div>
            <Label>Phone Number <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input type="tel" placeholder="+216 XX XXX XXX" {...register('phone')} />
          </div>

          <div>
            <Label>Nationality</Label>
            <select className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register('country')}>
              <option value="Tunisie">🇹🇳 Tunisie</option>
              <option value="Algérie">🇩🇿 Algérie</option>
              <option value="Maroc">🇲🇦 Maroc</option>
              <option value="Libye">🇱🇾 Libye</option>
              <option value="Égypte">🇪🇬 Égypte</option>
              <option value="France">🇫🇷 France</option>
              <option value="Italie">🇮🇹 Italie</option>
              <option value="Allemagne">🇩🇪 Allemagne</option>
              <option value="Espagne">🇪🇸 Espagne</option>
              <option value="Belgique">🇧🇪 Belgique</option>
              <option value="Suisse">🇨🇭 Suisse</option>
              <option value="Canada">🇨🇦 Canada</option>
              <option value="Autre">🌍 Autre</option>
            </select>
          </div>

          {eventData.pickupLocations && (eventData.pickupLocations as string[]).length > 0 && (
            <div>
              <Label>Lieu de retrait du dossard</Label>
              <select
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('lieuDeRetrait')}
              >
                <option value="">Choisir un lieu de retrait…</option>
                {(eventData.pickupLocations as string[]).map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          )}

          {registerMutation.isError && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">
              {(registerMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Something went wrong.'}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? 'Registering…' : `Register${selectedRace ? ` for ${selectedRace.name}` : ''}`}
          </Button>

          <p className="text-center text-xs text-gray-400">
            By registering you agree to the event terms and conditions.
          </p>
        </form>
      </div>
    </div>
  );
}
