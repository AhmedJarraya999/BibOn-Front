'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { UserPlus, Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { type Volunteer } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { VolunteerForm } from '@/components/volunteers/volunteer-form';
import { InviteVolunteerForm } from '@/components/volunteers/invite-volunteer-form';
import { TableSkeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';

const PERM_LABELS: Record<string, string> = {
  CHECK_IN: 'Check-in',
  CHECKPOINT: 'Checkpoint',
  DISTRIBUTION: 'Distribution',
  FINISH_LINE: 'Finish line',
};

export default function VolunteersPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Volunteer | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const { data, isLoading } = useQuery({
    queryKey: ['volunteers'],
    queryFn: () => api.get('/volunteers', { params: { page: 1, limit: 100 } }).then((r) => r.data),
  });

  const volunteers: Volunteer[] = data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/volunteers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['volunteers'] }); toast.success('Volunteer removed.'); },
    onError: () => toast.error('Could not remove volunteer.'),
  });

  const handleDelete = async (v: Volunteer) => {
    const ok = await confirm({ title: 'Remove Volunteer', message: 'Remove this volunteer from the event?', confirmLabel: 'Remove' });
    if (ok) deleteMutation.mutate(v.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Volunteers</h1>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Invite Volunteer
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Email', 'Event', 'Station / Role', ''].map((h, i) => (
                  <th key={i} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {volunteers.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{v.user?.name ?? '—'}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{v.user?.email ?? '—'}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {(v as any).event?.name ?? v.eventId}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {v.permissions.map((p) => (
                        <Badge key={p} variant="info">{PERM_LABELS[p] ?? p}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditTarget(v)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        title="Edit permissions"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(v)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {volunteers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    No volunteers yet. Click <strong>Invite Volunteer</strong> to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite a Volunteer" size="lg">
        <InviteVolunteerForm onSuccess={() => { setInviteOpen(false); queryClient.invalidateQueries({ queryKey: ['volunteers'] }); toast.success('Invitation sent!'); }} />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Station / Role">
        {editTarget && (
          <VolunteerForm volunteer={editTarget} onSuccess={() => { setEditTarget(null); queryClient.invalidateQueries({ queryKey: ['volunteers'] }); }} />
        )}
      </Modal>
    </div>
  );
}
