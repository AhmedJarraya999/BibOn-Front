'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Pencil, Trash2, ImageIcon, Share2 } from 'lucide-react';
import api from '@/lib/api';
import { type Event } from '@/types';
import { useOrg } from '@/lib/org-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { EventForm } from '@/components/events/event-form';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';
import { CardGridSkeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

export default function EventsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Event | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { activeOrg } = useOrg();

  const { data, isLoading } = useQuery({
    queryKey: ['events', page, search],
    queryFn: () =>
      api.get('/events', { params: { page, limit: 20, search: search || undefined } }).then((r) => r.data),
  });

  const events: Event[] = data?.data ?? [];
  const meta = data?.meta;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/events/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['events'] }); toast.success('Event deleted.'); },
    onError: () => toast.error('Could not delete event.'),
  });

  const handleDelete = async (event: Event) => {
    const ok = await confirm({ title: 'Delete Event', message: `Delete "${event.name}"? This cannot be undone.`, confirmLabel: 'Delete' });
    if (ok) deleteMutation.mutate(event.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          {activeOrg && <p className="mt-0.5 text-sm text-gray-500">{activeOrg.name}</p>}
        </div>
        <Button onClick={() => router.push('/events/new')}>
          <Plus className="mr-2 h-4 w-4" /> New Event
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Search events…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {isLoading ? (
        <CardGridSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} className="hover:shadow-md transition-shadow overflow-hidden">
              {event.logoUrl ? (
                <div className="h-36 w-full bg-gray-50 overflow-hidden">
                  <img src={event.logoUrl} alt={event.name} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="h-36 w-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-indigo-200" />
                </div>
              )}
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 truncate">{event.name}</h2>
                    <p className="mt-1 text-sm text-gray-500 truncate">{event.location}</p>
                    <p className="mt-2 text-xs text-gray-400">
                      {formatDate(event.startDate ?? event.date)}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2 flex-shrink-0">
                    <button
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/e/${event.slug ?? event.id}`); toast.success('Link copied!'); }}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                      title="Copy public link"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditTarget(event)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(event)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {events.length === 0 && (
            <p className="col-span-full text-center text-gray-500 py-12">No events found.</p>
          )}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-gray-600">Page {meta.page} of {meta.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === meta.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Event">
        <EventForm onSuccess={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Event">
        {editTarget && (
          <EventForm event={editTarget} onSuccess={() => setEditTarget(null)} />
        )}
      </Modal>
    </div>
  );
}
