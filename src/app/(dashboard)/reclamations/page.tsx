'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

interface Reclamation {
  id: string;
  name: string;
  phone?: string;
  note?: string;
  proofDescription?: string;
  temporaryBib?: string;
  status: 'PENDING' | 'RESOLVED' | 'REJECTED';
  resolvedNote?: string;
  event?: { name: string };
  race?: { name: string };
  createdAt: string;
}

const STATUS_CONFIG = {
  PENDING:  { label: 'Pending',  icon: Clock,         variant: 'warning' as const, color: 'text-amber-600' },
  RESOLVED: { label: 'Resolved', icon: CheckCircle,   variant: 'success' as const, color: 'text-green-600' },
  REJECTED: { label: 'Rejected', icon: XCircle,       variant: 'error'   as const, color: 'text-red-500'   },
};

export default function ReclamationsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED' | 'REJECTED'>('PENDING');
  const [resolveTarget, setResolveTarget] = useState<Reclamation | null>(null);
  const [resolveNote, setResolveNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['reclamations', filter],
    queryFn: () =>
      api.get('/reclamations', { params: filter !== 'ALL' ? { status: filter } : {} }).then((r) => r.data),
  });
  const reclamations: Reclamation[] = data ?? [];

  const resolveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'RESOLVED' | 'REJECTED' }) =>
      api.patch(`/reclamations/${id}/resolve`, { status, resolvedNote: resolveNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reclamations'] });
      toast.success('Reclamation updated.');
      setResolveTarget(null);
      setResolveNote('');
    },
    onError: () => toast.error('Could not update reclamation.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/reclamations/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['reclamations'] }); toast.success('Deleted.'); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-bold text-gray-900">Reclamations</h1>
        </div>
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {(['ALL', 'PENDING', 'RESOLVED', 'REJECTED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === s ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : reclamations.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-20 text-center">
          <CheckCircle className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500">No {filter !== 'ALL' ? filter.toLowerCase() : ''} reclamations</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reclamations.map((rec) => {
            const cfg = STATUS_CONFIG[rec.status];
            const Icon = cfg.icon;
            return (
              <div key={rec.id} className="rounded-lg border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-gray-900">{rec.name}</span>
                      <Badge variant={cfg.variant}>
                        <Icon className="h-3 w-3 mr-1 inline" />{cfg.label}
                      </Badge>
                      {rec.temporaryBib && (
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-mono font-semibold text-blue-600">
                          Temp bib #{rec.temporaryBib}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                      {rec.phone && <span>📞 {rec.phone}</span>}
                      {rec.event && <span>🏁 {rec.event.name}{rec.race ? ` · ${rec.race.name}` : ''}</span>}
                      <span>🕐 {new Date(rec.createdAt).toLocaleString()}</span>
                    </div>
                    {rec.proofDescription && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Proof:</span> {rec.proofDescription}
                      </p>
                    )}
                    {rec.note && (
                      <p className="text-sm text-gray-500 italic">"{rec.note}"</p>
                    )}
                    {rec.resolvedNote && (
                      <p className="text-sm text-gray-500">
                        <span className="font-medium">Resolution note:</span> {rec.resolvedNote}
                      </p>
                    )}
                  </div>

                  {rec.status === 'PENDING' && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white text-sm"
                        onClick={() => { setResolveTarget(rec); setResolveNote(''); }}
                      >
                        Resolve
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-500 border-red-200 hover:bg-red-50 text-sm"
                        onClick={() => resolveMutation.mutate({ id: rec.id, status: 'REJECTED' })}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                  {rec.status !== 'PENDING' && (
                    <button
                      onClick={() => deleteMutation.mutate(rec.id)}
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolve modal */}
      {resolveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Resolve — {resolveTarget.name}</h2>
            <p className="text-sm text-gray-500">Add a note (optional) before resolving:</p>
            <textarea
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
              rows={3}
              placeholder="e.g. Found in Flouci system, registration confirmed. Manual bib assigned."
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => resolveMutation.mutate({ id: resolveTarget.id, status: 'RESOLVED' })}
                disabled={resolveMutation.isPending}
              >
                {resolveMutation.isPending ? 'Saving…' : 'Mark Resolved'}
              </Button>
              <Button variant="outline" onClick={() => setResolveTarget(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
