'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, QrCode, CheckCircle, User, Award } from 'lucide-react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { type Race, type Registration } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

const QrScanner = dynamic(() => import('@/components/checkin/qr-scanner').then((m) => m.QrScanner), { ssr: false });

export default function MedalsPage() {
  const [raceId, setRaceId] = useState('');
  const [search, setSearch] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [selected, setSelected] = useState<Registration | null>(null);
  const [scanning, setScanning] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: racesData } = useQuery({
    queryKey: ['races-medals'],
    queryFn: () => api.get('/races', { params: { limit: 100 } }).then((r) => r.data),
  });
  const races: Race[] = racesData?.data ?? [];

  const { data: allRegsData, isLoading: listLoading } = useQuery({
    queryKey: ['medals-regs', raceId],
    queryFn: () => api.get('/registrations', { params: { raceId, limit: 1000 } }).then((r) => r.data),
    enabled: !!raceId,
  });
  const allRegs: Registration[] = allRegsData?.data ?? [];
  const filteredRegs = listSearch.trim()
    ? allRegs.filter((r) => {
        const q = listSearch.toLowerCase();
        return (
          r.participant?.fullName?.toLowerCase().includes(q) ||
          r.participant?.email?.toLowerCase().includes(q) ||
          r.bibNumber?.toLowerCase().includes(q)
        );
      })
    : allRegs;

  const lookupById = async (id: string) => {
    try {
      const res = await api.get(`/registrations/${id}`);
      setSelected(res.data);
    } catch {
      toast.error('Registration not found.');
    }
  };

  const lookupMutation = useMutation({
    mutationFn: (q: string) =>
      api.get('/registrations/lookup', { params: { raceId, search: q } }).then((r) => r.data),
    onSuccess: (data) => {
      if (data.length === 1) setSelected(data[0]);
      else if (data.length === 0) toast.error('No participant found.');
    },
  });

  const distributeMutation = useMutation({
    mutationFn: (registrationId: string) =>
      api.post(`/registrations/${registrationId}/distributions`, { itemType: 'MEDAL' }),
    onSuccess: () => {
      toast.success('Medal issued.');
      if (selected) lookupById(selected.id);
      queryClient.invalidateQueries({ queryKey: ['medals-regs', raceId] });
    },
    onError: () => toast.error('Could not issue medal.'),
  });

  const revokeMutation = useMutation({
    mutationFn: (registrationId: string) =>
      api.delete(`/registrations/${registrationId}/distributions/MEDAL`),
    onSuccess: () => {
      toast.success('Medal revoked.');
      if (selected) lookupById(selected.id);
      queryClient.invalidateQueries({ queryKey: ['medals-regs', raceId] });
    },
    onError: () => toast.error('Could not revoke medal.'),
  });

  const medalIssued = selected?.distributions?.some((d: { itemType: string }) => d.itemType === 'MEDAL');

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Medal Distribution</h1>
        <div className="w-56">
          <select
            className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={raceId}
            onChange={(e) => { setRaceId(e.target.value); setSelected(null); }}
          >
            <option value="">Select a race…</option>
            {races.map((r) => (
              <option key={r.id} value={r.id}>{r.name} — {r.distance} km</option>
            ))}
          </select>
        </div>
      </div>

      {!raceId ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-20 text-center">
          <Award className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500">Select a race to start</p>
        </div>
      ) : (
        <div className="grid grid-cols-[260px_1fr_340px] gap-4 min-h-0 flex-1">

          {/* Participant list */}
          <div className="flex flex-col border border-gray-200 rounded-lg bg-white overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  className="w-full rounded-md border border-gray-200 pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Filter participants…"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">{filteredRegs.length} participant{filteredRegs.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {listLoading ? (
                <div className="p-4 text-center text-sm text-gray-400">Loading…</div>
              ) : filteredRegs.map((r) => {
                const issued = r.distributions?.some((d: { itemType: string }) => d.itemType === 'MEDAL');
                return (
                  <button
                    key={r.id}
                    onClick={() => { setSelected(r); lookupById(r.id); }}
                    className={`w-full text-left px-3 py-2.5 transition-colors ${
                      selected?.id === r.id
                        ? 'bg-blue-50 border-l-2 border-blue-500'
                        : 'hover:bg-gray-50 border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {r.participant?.fullName ?? r.participant?.email ?? '—'}
                      </span>
                    </div>
                    <div className="pl-5 mt-0.5">
                      {r.bibNumber && <span className="text-xs font-mono text-blue-600">#{r.bibNumber} · </span>}
                      <span className={`text-xs font-medium ${issued ? 'text-yellow-500' : 'text-gray-400'}`}>
                        {issued ? '🥇 issued' : 'not issued'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search / QR */}
          <Card className="self-start">
            <CardHeader><CardTitle className="text-base">Find Participant</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full" onClick={() => setScanning((s) => !s)}>
                <QrCode className="mr-2 h-4 w-4" />
                {scanning ? 'Cancel Scan' : 'Scan QR Code'}
              </Button>
              {scanning && <QrScanner onScan={(code) => { setScanning(false); lookupById(code); }} />}
              <div>
                <Label>Search by name, email or bib</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Search…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && lookupMutation.mutate(search)}
                  />
                  <Button onClick={() => lookupMutation.mutate(search)} disabled={!search || lookupMutation.isPending}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action panel */}
          {selected ? (
            <Card className="self-start">
              <CardHeader>
                <CardTitle className="text-base">{selected.participant?.fullName ?? 'Participant'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-gray-50 p-3 space-y-2 text-sm">
                  {selected.bibNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Bib</span>
                      <span className="font-mono font-semibold">#{selected.bibNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <Badge variant={selected.status === 'FINISHED' ? 'success' : 'info'}>
                      {selected.status ?? '—'}
                    </Badge>
                  </div>
                </div>

                {medalIssued ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-700 font-medium">
                      <CheckCircle className="h-4 w-4" /> Medal already issued
                    </div>
                    <button
                      onClick={() => revokeMutation.mutate(selected.id)}
                      disabled={revokeMutation.isPending}
                      className="text-xs text-red-500 hover:underline w-full text-center"
                    >
                      Revoke
                    </button>
                  </div>
                ) : (
                  <Button
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                    onClick={() => distributeMutation.mutate(selected.id)}
                    disabled={distributeMutation.isPending}
                  >
                    <Award className="mr-2 h-4 w-4" />
                    {distributeMutation.isPending ? 'Issuing…' : 'Issue Medal'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-center p-8">
              <User className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">Select a participant</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
