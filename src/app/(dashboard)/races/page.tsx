'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Search, Pencil, Trash2, MapPin, Flag, Route, X } from 'lucide-react';
import api from '@/lib/api';
import { type Race, type Event } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { RaceForm } from '@/components/races/race-form';
import { GpxUpload } from '@/components/races/gpx-upload';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';
import { CardGridSkeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/utils';
import { CheckpointPanel } from '@/components/checkpoints/checkpoint-panel';

// Dynamic import — Leaflet requires the browser DOM
const GpxMap = dynamic(
  () => import('@/components/races/gpx-map').then((m) => m.GpxMap),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading map…</div> },
);

export default function RacesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Race | null>(null);
  const [checkpointRace, setCheckpointRace] = useState<Race | null>(null);
  const [mapRace, setMapRace] = useState<Race | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const { data: eventsData } = useQuery({
    queryKey: ['events', 1, ''],
    queryFn: () => api.get('/events', { params: { limit: 100 } }).then((r) => r.data),
  });
  const events: Event[] = eventsData?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['races', page, search, selectedEventId],
    queryFn: () =>
      api.get('/races', {
        params: { page, limit: 20, search: search || undefined, eventId: selectedEventId || undefined },
      }).then((r) => r.data),
  });

  const races: Race[] = data?.data ?? [];
  const meta = data?.meta;
  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/races/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['races'] }); toast.success('Race deleted.'); },
    onError: () => toast.error('Could not delete race.'),
  });

  const handleDelete = async (race: Race) => {
    const ok = await confirm({ title: 'Delete Race', message: `Delete "${race.name}"? This cannot be undone.`, confirmLabel: 'Delete' });
    if (ok) deleteMutation.mutate(race.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Races</h1>
          {selectedEvent && <p className="mt-0.5 text-sm text-gray-500">{selectedEvent.name}</p>}
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Race
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex items-center gap-2 min-w-[220px]">
          <Flag className="h-4 w-4 text-gray-400 shrink-0" />
          <select
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedEventId}
            onChange={(e) => { setSelectedEventId(e.target.value); setPage(1); }}
          >
            <option value="">All events</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search races…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {isLoading ? (
        <CardGridSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {races.map((race) => (
            <Card key={race.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="font-semibold text-gray-900">{race.name}</h2>
                    <p className="mt-1 text-sm text-gray-500">{race.distance} km</p>
                    <p className="mt-2 text-xs text-gray-400">{formatDateTime(race.startTime)}</p>
                    {race.gpxUrl && (
                      <button
                        onClick={() => setMapRace(race)}
                        className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        <Route className="h-3.5 w-3.5" /> View route
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => setMapRace(race)}
                      className={`rounded p-1 hover:bg-gray-100 transition-colors ${race.gpxUrl ? 'text-blue-500 hover:text-blue-700' : 'text-gray-300 hover:text-gray-500'}`}
                      title={race.gpxUrl ? 'View GPX route' : 'No route uploaded'}
                    >
                      <Route className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setCheckpointRace(race)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      title="Manage checkpoints"
                    >
                      <MapPin className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditTarget(race)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(race)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {races.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <Flag className="h-10 w-10 text-gray-200 mb-3" />
              <p className="text-gray-500">
                {selectedEventId ? 'No races for this event yet.' : 'No races found.'}
              </p>
              {selectedEventId && (
                <Button className="mt-4" size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add first race
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-gray-600">Page {meta.page} of {meta.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Race">
        <RaceForm onSuccess={() => setCreateOpen(false)} defaultEventId={selectedEventId} />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Race">
        {editTarget && (
          <div className="space-y-6">
            <RaceForm race={editTarget} onSuccess={() => setEditTarget(null)} />
            <div className="border-t border-gray-100 pt-4">
              <GpxUpload race={editTarget} />
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!checkpointRace} onClose={() => setCheckpointRace(null)} title="Checkpoints" size="lg">
        {checkpointRace && (
          <CheckpointPanel race={checkpointRace} eventId={checkpointRace.eventId} />
        )}
      </Modal>

      {/* GPX Map modal — full-screen-ish */}
      {mapRace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative flex flex-col w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden" style={{ height: '85vh' }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 shrink-0">
              <Route className="h-5 w-5 text-blue-500" />
              <div className="flex-1">
                <h2 className="font-semibold text-gray-900">{mapRace.name}</h2>
                <p className="text-xs text-gray-400">{mapRace.distance} km · {formatDateTime(mapRace.startTime)}</p>
              </div>
              {!mapRace.gpxUrl && (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">No GPX uploaded</span>
              )}
              <button
                onClick={() => setMapRace(null)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Map or upload prompt */}
            <div className="flex-1 overflow-hidden">
              {mapRace.gpxUrl ? (
                <GpxMap raceId={mapRace.id} raceName={mapRace.name} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 bg-gray-50">
                  <Route className="h-12 w-12 text-gray-300" />
                  <div className="text-center">
                    <p className="text-gray-500 font-medium">No GPX route uploaded yet</p>
                    <p className="text-sm text-gray-400 mt-1">Edit this race to upload a .gpx file</p>
                  </div>
                  <Button size="sm" onClick={() => { setMapRace(null); setEditTarget(mapRace); }}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit race &amp; upload GPX
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
