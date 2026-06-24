'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Timer, Search, CheckCircle, XCircle, Trophy } from 'lucide-react';
import api from '@/lib/api';
import { type Registration, type Race } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { TableSkeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { formatDateTime } from '@/lib/utils';

function elapsed(startTime?: string, finishTime?: string): string {
  if (!startTime || !finishTime) return '—';
  const ms = new Date(finishTime).getTime() - new Date(startTime).getTime();
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0
    ? `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
    : `${m}m ${s.toString().padStart(2, '0')}s`;
}

export default function FinishPage() {
  const [raceId, setRaceId] = useState('');
  const [bibNumber, setBibNumber] = useState('');
  const [lookupResult, setLookupResult] = useState<Registration | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: racesData } = useQuery({
    queryKey: ['races-finish'],
    queryFn: () => api.get('/races', { params: { limit: 100 } }).then((r) => r.data),
  });
  const races: Race[] = racesData?.data ?? [];

  const { data: finishersData, isLoading: finishersLoading } = useQuery({
    queryKey: ['finishers', raceId],
    queryFn: () =>
      api.get('/registrations', { params: { raceId, status: 'FINISHED', limit: 100 } }).then((r) => r.data),
    enabled: !!raceId,
  });
  const finishers: Registration[] = finishersData?.data ?? [];

  const finishMutation = useMutation({
    mutationFn: (id: string) => api.post(`/registrations/${id}/finish`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['finishers', raceId] });
      toast.success(`Bib #${lookupResult?.bibNumber} recorded as finished!`);
      setLookupResult(null);
      setBibNumber('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Could not record finish time.');
    },
  });

  const handleLookup = async () => {
    if (!raceId || !bibNumber) return;
    setLookupLoading(true);
    setLookupError('');
    setLookupResult(null);
    try {
      const res = await api.get(`/races/${raceId}/registrations/by-bib/${bibNumber}`);
      setLookupResult(res.data);
    } catch {
      setLookupError('No registration found for this bib number.');
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Finish Line</h1>

      {/* Race selector */}
      <div className="max-w-sm">
        <Label>Race</Label>
        <select
          className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={raceId}
          onChange={(e) => { setRaceId(e.target.value); setLookupResult(null); setBibNumber(''); }}
        >
          <option value="">Select a race…</option>
          {races.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} — {r.distance} km · {formatDateTime(r.startTime)}
            </option>
          ))}
        </select>
      </div>

      {raceId && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Bib lookup + record finish */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Timer className="h-4 w-4 text-blue-600" /> Record Finish
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Bib Number</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder="e.g. 42"
                      value={bibNumber}
                      onChange={(e) => setBibNumber(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                    />
                    <Button onClick={handleLookup} disabled={lookupLoading}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {lookupError && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-700">
                    <XCircle className="h-4 w-4 shrink-0" />
                    <p className="text-sm">{lookupError}</p>
                  </div>
                )}

                {lookupResult && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900">
                        {lookupResult.participant?.fullName ?? 'Participant'}
                      </p>
                      <Badge variant={lookupResult.status === 'FINISHED' ? 'success' : 'info'}>
                        {lookupResult.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">Bib <span className="font-mono font-medium text-gray-900">#{lookupResult.bibNumber}</span></p>

                    {lookupResult.status === 'FINISHED' ? (
                      <div className="flex items-center gap-2 rounded bg-green-50 p-2 text-green-700 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        Already finished · {lookupResult.finishTime ? formatDateTime(lookupResult.finishTime) : ''}
                      </div>
                    ) : lookupResult.status !== 'CHECKED_IN' ? (
                      <p className="text-sm text-yellow-600">Participant must be checked in before recording a finish.</p>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => finishMutation.mutate(lookupResult.id)}
                        disabled={finishMutation.isPending}
                      >
                        <Trophy className="mr-2 h-4 w-4" />
                        {finishMutation.isPending ? 'Recording…' : 'Record Finish Time'}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Finishers leaderboard */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Finishers ({finishers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {finishersLoading ? (
                  <TableSkeleton rows={5} cols={3} />
                ) : finishers.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-400">No finishers yet.</p>
                ) : (
                  <div className="space-y-2">
                    {finishers
                      .sort((a, b) =>
                        new Date(a.finishTime ?? 0).getTime() - new Date(b.finishTime ?? 0).getTime()
                      )
                      .map((f, index) => (
                        <div
                          key={f.id}
                          className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2"
                        >
                          <span className={`w-6 text-center text-sm font-bold ${
                            index === 0 ? 'text-yellow-500' :
                            index === 1 ? 'text-gray-400' :
                            index === 2 ? 'text-amber-600' : 'text-gray-400'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="font-mono text-sm font-medium text-gray-600 w-10">
                            #{f.bibNumber}
                          </span>
                          <span className="flex-1 text-sm text-gray-900 truncate">
                            {f.participant?.fullName ?? '—'}
                          </span>
                          <span className="text-sm font-medium text-blue-700">
                            {elapsed(f.startTime, f.finishTime)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!raceId && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-20 text-center">
          <Timer className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500">Select a race to start recording finish times</p>
        </div>
      )}
    </div>
  );
}
