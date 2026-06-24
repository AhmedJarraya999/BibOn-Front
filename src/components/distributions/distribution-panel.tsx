'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, CheckCircle, Trash2, Plus } from 'lucide-react';
import api from '@/lib/api';
import { type Distribution } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/utils';

const ITEM_TYPES = ['MEDAL', 'RAVITO', 'BIB_KIT', 'TSHIRT', 'OTHER'] as const;
type ItemType = typeof ITEM_TYPES[number];

const ITEM_LABELS: Record<ItemType, string> = {
  MEDAL: 'Medal',
  RAVITO: 'Ravito',
  BIB_KIT: 'Bib Kit',
  TSHIRT: 'T-Shirt',
  OTHER: 'Other',
};

interface Props {
  registrationId: string;
  bibNumber: string;
  participantName: string;
}

export function DistributionPanel({ registrationId, bibNumber, participantName }: Props) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const { data: distributions = [], isLoading } = useQuery<Distribution[]>({
    queryKey: ['distributions', registrationId],
    queryFn: () =>
      api.get(`/registrations/${registrationId}/distributions`).then((r) => r.data),
  });

  const issuedTypes = new Set(distributions.map((d) => d.itemType));

  const issueMutation = useMutation({
    mutationFn: (itemType: ItemType) =>
      api.post(`/registrations/${registrationId}/distributions`, { itemType }),
    onSuccess: (_, itemType) => {
      queryClient.invalidateQueries({ queryKey: ['distributions', registrationId] });
      toast.success(`${ITEM_LABELS[itemType]} issued to bib #${bibNumber}.`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Could not issue item.');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (itemType: string) =>
      api.delete(`/registrations/${registrationId}/distributions/${itemType}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributions', registrationId] });
      toast.success('Item revoked.');
    },
    onError: () => toast.error('Could not revoke item.'),
  });

  const handleRevoke = async (d: Distribution) => {
    const ok = await confirm({
      title: 'Revoke Item',
      message: `Revoke ${ITEM_LABELS[d.itemType as ItemType] ?? d.itemType} issued to bib #${bibNumber}?`,
      confirmLabel: 'Revoke',
    });
    if (ok) revokeMutation.mutate(d.itemType);
  };

  const pendingTypes = ITEM_TYPES.filter((t) => !issuedTypes.has(t));

  return (
    <div className="space-y-6">
      {/* Issued items */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Issued</h3>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : distributions.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-gray-200 py-8 text-center">
            <Package className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Nothing issued yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {distributions.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {ITEM_LABELS[d.itemType as ItemType] ?? d.itemType}
                    </p>
                    <p className="text-xs text-gray-400">{formatDateTime(d.issuedAt)}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(d)}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  title="Revoke"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Issue new items */}
      {pendingTypes.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Issue Item</h3>
          <div className="grid grid-cols-2 gap-2">
            {pendingTypes.map((type) => (
              <button
                key={type}
                onClick={() => issueMutation.mutate(type)}
                disabled={issueMutation.isPending}
                className="flex items-center gap-2 rounded-lg border border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                {ITEM_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* All issued */}
      {pendingTypes.length === 0 && distributions.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-sm font-medium text-green-700">All items issued to {participantName}</p>
        </div>
      )}

      {/* Summary badges */}
      {distributions.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Summary</h3>
          <div className="flex flex-wrap gap-2">
            {distributions.map((d) => (
              <Badge key={d.id} variant="success">
                {ITEM_LABELS[d.itemType as ItemType] ?? d.itemType}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
