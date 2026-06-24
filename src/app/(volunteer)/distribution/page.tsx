'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, QrCode, CheckCircle, XCircle, Banknote, Package } from 'lucide-react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { type Race, type Registration } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

const QrScanner = dynamic(() => import('@/components/checkin/qr-scanner'), { ssr: false });

const ITEMS = ['BIB_KIT', 'TSHIRT', 'MEDAL', 'RAVITO', 'OTHER'] as const;

function paymentBadge(status: string) {
  if (status === 'PAID') return <Badge variant="success">PAID</Badge>;
  if (status === 'PENDING') return <Badge variant="warning">PENDING</Badge>;
  return <Badge variant="default">{status}</Badge>;
}

export default function DistributionPage() {
  const [raceId, setRaceId] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Registration[]>([]);
  const [selected, setSelected] = useState<Registration | null>(null);
  const [scanning, setScanning] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: racesData } = useQuery({
    queryKey: ['races-dist'],
    queryFn: () => api.get('/races', { params: { limit: 100 } }).then((r) => r.data),
  });
  const races: Race[] = racesData?.data ?? [];

  const lookupMutation = useMutation({
    mutationFn: (q: string) =>
      api.get('/registrations/lookup', { params: { raceId, search: q } }).then((r) => r.data),
    onSuccess: (data) => {
      setResults(data);
      if (data.length === 1) setSelected(data[0]);
    },
  });

  const lookupById = async (id: string) => {
    try {
      const res = await api.get(`/registrations/${id}`);
      setSelected(res.data);
      setResults([res.data]);
    } catch {
      toast.error('Registration not found.');
    }
  };

  const handleQrScan = (code: string) => {
    setScanning(false);
    lookupById(code);
  };

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/registrations/${id}`, { paymentStatus: 'PAID' }),
    onSuccess: (res) => {
      setSelected(res.data);
      toast.success('Payment recorded.');
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    },
    onError: () => toast.error('Could not record payment.'),
  });

  const distributeMutation = useMutation({
    mutationFn: ({ registrationId, itemType }: { registrationId: string; itemType: string }) =>
      api.post(`/registrations/${registrationId}/distributions`, { itemType }),
    onSuccess: (_, vars) => {
      toast.success(`${vars.itemType.replace('_', ' ')} issued.`);
      if (selected) lookupById(selected.id);
    },
    onError: () => toast.error('Could not issue item.'),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ registrationId, itemType }: { registrationId: string; itemType: string }) =>
      api.delete(`/registrations/${registrationId}/distributions/${itemType}`),
    onSuccess: (_, vars) => {
      toast.success(`${vars.itemType.replace('_', ' ')} revoked.`);
      if (selected) lookupById(selected.id);
    },
    onError: () => toast.error('Could not revoke item.'),
  });

  const issuedTypes = new Set(selected?.distributions?.map((d: { itemType: string }) => d.itemType) ?? []);
  const canCollectOnsite = selected?.paymentStatus !== 'PAID';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Bib Distribution</h1>

      {/* Race selector */}
      <div className="max-w-sm">
        <Label>Race</Label>
        <select
          className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={raceId}
          onChange={(e) => { setRaceId(e.target.value); setSelected(null); setResults([]); }}
        >
          <option value="">Select a race…</option>
          {races.map((r) => (
            <option key={r.id} value={r.id}>{r.name} — {r.distance} km</option>
          ))}
        </select>
      </div>

      {raceId && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Lookup panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Find Participant</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* QR scan */}
                <Button variant="outline" className="w-full" onClick={() => setScanning((s) => !s)}>
                  <QrCode className="mr-2 h-4 w-4" />
                  {scanning ? 'Cancel Scan' : 'Scan QR Code'}
                </Button>
                {scanning && (
                  <QrScanner onScan={handleQrScan} onError={() => setScanning(false)} />
                )}

                {/* Manual search */}
                <div>
                  <Label>Search by name or email</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder="Ahmed Jarraya…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && lookupMutation.mutate(search)}
                    />
                    <Button onClick={() => lookupMutation.mutate(search)} disabled={!search || lookupMutation.isPending}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Results list */}
                {results.length > 1 && (
                  <div className="space-y-1">
                    {results.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setSelected(r)}
                        className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                          selected?.id === r.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-medium">{r.participant?.fullName}</span>
                        <span className="ml-2 text-gray-400">{r.participant?.email}</span>
                      </button>
                    ))}
                  </div>
                )}
                {results.length === 0 && lookupMutation.isSuccess && (
                  <p className="text-sm text-gray-400 text-center">No results found.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Participant action panel */}
          {selected && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {selected.participant?.fullName ?? 'Participant'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Bib</span>
                    <span className="font-mono font-semibold">#{selected.bibNumber ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Status</span>
                    <Badge variant="info">{selected.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Payment</span>
                    {paymentBadge(selected.paymentStatus ?? 'PENDING')}
                  </div>

                  {/* Collect on-site payment */}
                  {canCollectOnsite && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-sm text-amber-700 font-medium mb-2">Payment not yet received</p>
                      <Button
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={() => markPaidMutation.mutate(selected.id)}
                        disabled={markPaidMutation.isPending}
                      >
                        <Banknote className="mr-2 h-4 w-4" />
                        {markPaidMutation.isPending ? 'Recording…' : 'Collect Cash Payment'}
                      </Button>
                    </div>
                  )}

                  {/* Distribution items */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Package className="h-4 w-4" /> Items
                    </p>
                    <div className="space-y-2">
                      {ITEMS.map((item) => {
                        const issued = issuedTypes.has(item);
                        return (
                          <div key={item} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                            <div className="flex items-center gap-2 text-sm">
                              {issued
                                ? <CheckCircle className="h-4 w-4 text-green-500" />
                                : <XCircle className="h-4 w-4 text-gray-300" />
                              }
                              <span className={issued ? 'text-gray-900' : 'text-gray-400'}>
                                {item.replace('_', ' ')}
                              </span>
                            </div>
                            {issued ? (
                              <button
                                onClick={() => revokeMutation.mutate({ registrationId: selected.id, itemType: item })}
                                className="text-xs text-red-500 hover:underline"
                              >
                                Revoke
                              </button>
                            ) : (
                              <button
                                onClick={() => distributeMutation.mutate({ registrationId: selected.id, itemType: item })}
                                disabled={!selected || distributeMutation.isPending}
                                className="text-xs text-blue-600 hover:underline disabled:opacity-40"
                              >
                                Issue
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {!raceId && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-20 text-center">
          <Package className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500">Select a race to start distribution</p>
        </div>
      )}
    </div>
  );
}
