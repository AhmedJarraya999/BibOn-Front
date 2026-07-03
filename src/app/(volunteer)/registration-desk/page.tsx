'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, QrCode, Banknote, CheckCircle, ClipboardList } from 'lucide-react';
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

function statusBadge(status: string) {
  if (status === 'CONFIRMED') return <Badge variant="success">Confirmed</Badge>;
  if (status === 'PENDING') return <Badge variant="warning">Pending</Badge>;
  return <Badge variant="default">{status}</Badge>;
}

function paymentBadge(status: string) {
  if (status === 'PAID') return <Badge variant="success">Paid</Badge>;
  if (status === 'PENDING') return <Badge variant="warning">Unpaid</Badge>;
  return <Badge variant="default">{status}</Badge>;
}

export default function RegistrationDeskPage() {
  const [raceId, setRaceId] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Registration[]>([]);
  const [selected, setSelected] = useState<Registration | null>(null);
  const [scanning, setScanning] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: racesData } = useQuery({
    queryKey: ['races-regdesk'],
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
    onError: () => toast.error('Lookup failed.'),
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

  const confirmMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/registrations/${id}`, { status: 'CONFIRMED' }),
    onSuccess: (res) => {
      setSelected(res.data);
      toast.success('Registration confirmed.');
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    },
    onError: () => toast.error('Could not confirm registration.'),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/registrations/${id}`, { paymentStatus: 'PAID' }),
    onSuccess: (res) => {
      setSelected(res.data);
      toast.success('Payment recorded.');
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    },
    onError: () => toast.error('Could not record payment.'),
  });

  const isConfirmed = selected?.status === 'CONFIRMED';
  const isPaid = selected?.paymentStatus === 'PAID';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Registration Desk</h1>

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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Find Participant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full" onClick={() => setScanning((s) => !s)}>
                <QrCode className="mr-2 h-4 w-4" />
                {scanning ? 'Cancel Scan' : 'Scan QR Code'}
              </Button>
              {scanning && <QrScanner onScan={handleQrScan} />}

              <div>
                <Label>Search by name or email</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Ahmed Jarraya…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && lookupMutation.mutate(search)}
                  />
                  <Button
                    onClick={() => lookupMutation.mutate(search)}
                    disabled={!search || lookupMutation.isPending}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

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

          {/* Action panel */}
          {selected && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-gray-400" />
                  {selected.participant?.fullName ?? 'Participant'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-gray-50 p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email</span>
                    <span className="font-medium">{selected.participant?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    {statusBadge(selected.status ?? 'PENDING')}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment</span>
                    {paymentBadge(selected.paymentStatus ?? 'PENDING')}
                  </div>
                  {selected.bibNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Bib</span>
                      <span className="font-mono font-semibold">#{selected.bibNumber}</span>
                    </div>
                  )}
                </div>

                {/* Confirm registration */}
                {!isConfirmed ? (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => confirmMutation.mutate(selected.id)}
                    disabled={confirmMutation.isPending}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {confirmMutation.isPending ? 'Confirming…' : 'Confirm Arrival'}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium">
                    <CheckCircle className="h-4 w-4" />
                    Arrival confirmed
                  </div>
                )}

                {/* Collect payment */}
                {!isPaid ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                    <p className="text-sm text-amber-700 font-medium">Payment not yet received</p>
                    <Button
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={() => markPaidMutation.mutate(selected.id)}
                      disabled={markPaidMutation.isPending}
                    >
                      <Banknote className="mr-2 h-4 w-4" />
                      {markPaidMutation.isPending ? 'Recording…' : 'Collect Cash Payment'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium">
                    <CheckCircle className="h-4 w-4" />
                    Payment received
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!raceId && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-20 text-center">
          <ClipboardList className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500">Select a race to open the registration desk</p>
        </div>
      )}
    </div>
  );
}
