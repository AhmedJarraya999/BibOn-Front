'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { type Registration } from '@/types';

interface Props {
  raceId: string;
  itemType?: string;
  refreshKey?: number;
}

interface Stat { label: string; value: number; total: number; color: string; }

export function VolunteerStats({ raceId, itemType, refreshKey }: Props) {
  const { data, refetch } = useQuery({
    queryKey: ['volunteer-stats', raceId],
    queryFn: () => api.get('/registrations', { params: { raceId, limit: 1000 } }).then((r) => r.data),
    enabled: !!raceId,
    refetchInterval: 30000,
  });

  useEffect(() => { if (refreshKey) refetch(); }, [refreshKey, refetch]);

  const regs: Registration[] = data?.data ?? [];
  const total = regs.length;
  if (total === 0) return null;

  const paid = regs.filter((r) => r.paymentStatus === 'PAID').length;
  const withBib = regs.filter((r) => r.bibNumber).length;
  const itemIssued = itemType
    ? regs.filter((r) => r.distributions?.some((d: { itemType: string }) => d.itemType === itemType)).length
    : null;

  const stats: Stat[] = [
    { label: 'Total', value: total, total, color: '#6366f1' },
    { label: 'Paid', value: paid, total, color: '#10b981' },
    { label: 'Bib assigned', value: withBib, total, color: '#3b82f6' },
    ...(itemType && itemIssued !== null
      ? [{ label: `${itemType.replace('_', ' ')} issued`, value: itemIssued, total, color: '#f59e0b' }]
      : []),
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <div className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
          <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.round((s.value / s.total) * 100)}%`, background: s.color }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1">{Math.round((s.value / s.total) * 100)}%</div>
        </div>
      ))}
    </div>
  );
}
