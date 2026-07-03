'use client';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { MapPin, Calendar, Clock, Trophy, ArrowRight, ImageIcon } from 'lucide-react';
import { type Event, type Race } from '@/types';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002/api';
const publicApi = axios.create({ baseURL: BASE_URL });

export default function PublicEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ['public-event', id],
    queryFn: () => publicApi.get(`/events/${id}`).then((r) => r.data),
  });

  const { data: racesData, isLoading: racesLoading } = useQuery({
    queryKey: ['public-races', event?.id],
    queryFn: () => publicApi.get('/races', { params: { eventId: event?.id, limit: 50 } }).then((r) => r.data),
    enabled: !!event?.id,
  });
  const races: Race[] = racesData?.data ?? [];

  if (eventLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center text-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event not found</h1>
          <p className="mt-2 text-gray-500">This event may have been removed or the link is incorrect.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="relative bg-white">
        {event.logoUrl ? (
          <div className="h-64 w-full overflow-hidden sm:h-80">
            <img src={event.logoUrl} alt={event.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        ) : (
          <div className="h-64 w-full bg-gradient-to-br from-blue-600 to-indigo-700 sm:h-80 flex items-center justify-center">
            <ImageIcon className="h-20 w-20 text-white/20" />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <h1 className="text-3xl font-bold drop-shadow sm:text-4xl">{event.name}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        {/* Event details */}
        <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Event Details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 text-gray-600">
              <Calendar className="h-5 w-5 text-blue-500 shrink-0" />
              <span>{formatDate(event.date)}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <MapPin className="h-5 w-5 text-blue-500 shrink-0" />
              <span>{event.location}</span>
            </div>
          </div>
        </div>

        {/* Races */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Races</h2>
          {racesLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-200" />
              ))}
            </div>
          ) : races.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center text-gray-400 shadow-sm">
              <Trophy className="mx-auto h-10 w-10 mb-3 text-gray-200" />
              <p>No races announced yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {races.map((race) => (
                <div key={race.id} className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700 font-bold text-sm">
                      {race.distance}km
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{race.name}</p>
                      {race.startTime && (
                        <p className="text-sm text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock className="h-3.5 w-3.5" />
                          {`${String(new Date(race.startTime).getUTCHours()).padStart(2,'0')}:${String(new Date(race.startTime).getUTCMinutes()).padStart(2,'0')}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-lg font-bold text-blue-600">
                    {Number(race.fee) > 0 ? `${Number(race.fee).toFixed(3)} TND` : 'Free'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-blue-600 p-6 text-center text-white shadow-lg">
          <h2 className="text-xl font-bold mb-2">Ready to run?</h2>
          <p className="text-blue-100 mb-5 text-sm">
            Register now and receive your credentials by email to track your participation.
          </p>
          <Button
            onClick={() => router.push(`/register/${id}`)}
            className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8 py-3 text-base"
          >
            Register Now <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
