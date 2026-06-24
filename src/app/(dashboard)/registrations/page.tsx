'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Package } from 'lucide-react';
import api from '@/lib/api';
import { type Registration } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Drawer } from '@/components/ui/drawer';
import { RegistrationForm } from '@/components/registrations/registration-form';
import { DistributionPanel } from '@/components/distributions/distribution-panel';
import { TableSkeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  REGISTERED: 'info',
  CHECKED_IN: 'success',
  DNS: 'warning',
  DNF: 'danger',
  FINISHED: 'success',
  DISQUALIFIED: 'danger',
};

const STATUS_OPTIONS = ['REGISTERED', 'CHECKED_IN', 'DNS', 'DNF', 'FINISHED', 'DISQUALIFIED'];

interface DistributionTarget {
  registrationId: string;
  bibNumber: string;
  participantName: string;
}

export default function RegistrationsPage() {
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [distributionTarget, setDistributionTarget] = useState<DistributionTarget | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['registrations', page],
    queryFn: () => api.get('/registrations', { params: { page, limit: 20 } }).then((r) => r.data),
  });

  const registrations: Registration[] = data?.data ?? [];
  const meta = data?.meta;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/registrations/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      toast.success('Status updated.');
    },
    onError: () => toast.error('Could not update status.'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Registrations</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Registration
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Bib', 'Participant', 'Race', 'Status', 'Items'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {registrations.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-mono font-medium text-gray-900">{r.bibNumber}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{r.participant?.fullName ?? r.participantId}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{r.race?.name ?? r.raceId}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <select
                        value={r.status}
                        onChange={(e) => statusMutation.mutate({ id: r.id, status: e.target.value })}
                        className="rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <Badge variant={statusVariant[r.status] ?? 'default'}>{r.status}</Badge>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <button
                      onClick={() => setDistributionTarget({
                        registrationId: r.id,
                        bibNumber: r.bibNumber,
                        participantName: r.participant?.fullName ?? 'Participant',
                      })}
                      className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      <Package className="h-3.5 w-3.5" />
                      Items
                    </button>
                  </td>
                </tr>
              ))}
              {registrations.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-gray-500">No registrations found.</td></tr>
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

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Registration">
        <RegistrationForm onSuccess={() => setCreateOpen(false)} />
      </Modal>

      <Drawer
        open={!!distributionTarget}
        onClose={() => setDistributionTarget(null)}
        title={`Bib #${distributionTarget?.bibNumber ?? ''}`}
        subtitle={distributionTarget?.participantName}
      >
        {distributionTarget && (
          <DistributionPanel
            registrationId={distributionTarget.registrationId}
            bibNumber={distributionTarget.bibNumber}
            participantName={distributionTarget.participantName}
          />
        )}
      </Drawer>
    </div>
  );
}
