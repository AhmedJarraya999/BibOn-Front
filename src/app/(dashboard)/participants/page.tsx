'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { type Participant } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { ParticipantForm } from '@/components/participants/participant-form';
import { TableSkeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';
import { formatDate } from '@/lib/utils';

export default function ParticipantsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Participant | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const { data, isLoading } = useQuery({
    queryKey: ['participants', page, search],
    queryFn: () =>
      api.get('/participants', { params: { page, limit: 20, search: search || undefined } }).then((r) => r.data),
  });

  const participants: Participant[] = data?.data ?? [];
  const meta = data?.meta;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/participants/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['participants'] }); toast.success('Participant deleted.'); },
    onError: () => toast.error('Could not delete participant.'),
  });

  const handleDelete = async (p: Participant) => {
    const ok = await confirm({ title: 'Delete Participant', message: `Delete "${p.fullName}"? This cannot be undone.`, confirmLabel: 'Delete' });
    if (ok) deleteMutation.mutate(p.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Participants</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Participant
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Email', 'Gender', 'Birthdate', ''].map((h, i) => (
                  <th key={i} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {participants.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{p.fullName}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{p.email}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <Badge variant={p.gender === 'M' ? 'info' : 'warning'}>{p.gender === 'M' ? 'Male' : 'Female'}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{formatDate(p.birthdate)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditTarget(p)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {participants.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-gray-500">No participants found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-gray-600">Page {meta.page} of {meta.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Participant">
        <ParticipantForm onSuccess={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Participant">
        {editTarget && (
          <ParticipantForm participant={editTarget} onSuccess={() => setEditTarget(null)} />
        )}
      </Modal>
    </div>
  );
}
