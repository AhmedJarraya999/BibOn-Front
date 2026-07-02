'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, MapPin, Flag } from 'lucide-react';
import api from '@/lib/api';
import { type Race, type Event } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { RaceForm } from '@/components/races/race-form';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';
import { CardGridSkeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/utils';
import { CheckpointPanel } from '@/components/checkpoints/checkpoint-panel';

export default function RacesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Race | null>(null);
  const [checkpointRace, setCheckpointRace] = useState<Race | null>(null);
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
        params: {
          page,
          limit: 20,
          search: search || undefined,
          eventId: selectedEventId || undefined,
        },
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
          {selectedEvent && (
            <p className="mt-0.5 text-sm text-gray-500">{selectedEvent.name}</p>
          )}
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Race
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Event filter */}
        <div className="flex items-center gap-2 min-w-[220px]">
          <Flag className="h-4 w-4 text-gray-400 shrink-0" />
          <select
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedEventId}
            onChange={(e) => { setSelectedEventId(e.target.value); setPage(1); }}
          >
            <option value="">All events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        {/* Search */}
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
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => setCheckpointRace(race)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      title="Gérer les checkpoints"
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
          <RaceForm race={editTarget} onSuccess={() => setEditTarget(null)} />
        )}
      </Modal>

      <Modal open={!!checkpointRace} onClose={() => setCheckpointRace(null)} title="Checkpoints" size="lg">
        {checkpointRace && (
          <CheckpointPanel race={checkpointRace} eventId={checkpointRace.eventId} />
        )}
      </Modal>
    </div>
  );
}
