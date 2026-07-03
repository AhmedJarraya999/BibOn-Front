'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, QrCode, CheckCircle, XCircle, Package, Banknote, User } from 'lucide-react';
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

const ITEMS = ['BIB_KIT', 'TSHIRT', 'MEDAL', 'RAVITO', 'OTHER'] as const;

function paymentBadge(status: string) {
  if (status === 'PAID') return <Badge variant="success">PAID</Badge>;
  if (status === 'PENDING') return <Badge variant="warning">PENDING</Badge>;
  return <Badge variant="default">{status}</Badge>;
}

export default function DistributionPage() {
  const [raceId, setRaceId] = useState('');
  const [search, setSearch] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [selected, setSelected] = useState<Registration | null>(null);
  const [scanning, setScanning] = useState(false);
  const [bibInput, setBibInput] = useState('');
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: racesData } = useQuery({
    queryKey: ['races-dist'],
    queryFn: () => api.get('/races', { params: { limit: 100 } }).then((r) => r.data),
  });
  const races: Race[] = racesData?.data ?? [];

  // Full participant list for the selected race
  const { data: allRegsData, isLoading: listLoading } = useQuery({
    queryKey: ['dist-all-regs', raceId],
    queryFn: () => api.get('/registrations', { params: { raceId, limit: 500 } }).then((r) => r.data),
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

  const handleQrScan = (code: string) => {
    setScanning(false);
    lookupById(code);
  };

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/registrations/${id}`, { paymentStatus: 'PAID' }),
    onSuccess: (res) => {
      setSelected(res.data);
      queryClient.invalidateQueries({ queryKey: ['dist-all-regs', raceId] });
      toast.success('Payment recorded.');
    },
    onError: () => toast.error('Could not record payment.'),
  });

  const assignBibMutation = useMutation({
    mutationFn: ({ id, bibNumber }: { id: string; bibNumber: string }) =>
      api.patch(`/registrations/${id}`, { bibNumber }),
    onSuccess: (res) => {
      setSelected(res.data);
      setBibInput('');
      queryClient.invalidateQueries({ queryKey: ['dist-all-regs', raceId] });
      toast.success(`Bib #${res.data.bibNumber} assigned.`);
    },
    onError: () => toast.error('Could not assign bib number.'),
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
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Bib Distribution</h1>
        <div className="w-56">
          <select
            className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={raceId}
            onChange={(e) => { setRaceId(e.target.value); setSelected(null); setBibInput(''); }}
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
          <Package className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500">Select a race to start distribution</p>
        </div>
      ) : (
        <div className="grid grid-cols-[260px_1fr_360px] gap-4 min-h-0 flex-1">

          {/* ── Column 1: Scrollable participant list ── */}
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
              ) : filteredRegs.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-400">No participants</div>
              ) : (
                filteredRegs.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setSelected(r); setBibInput(''); lookupById(r.id); }}
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
                    <div className="flex items-center gap-2 mt-0.5 pl-5">
                      {r.bibNumber
                        ? <span className="text-xs font-mono text-blue-600">#{r.bibNumber}</span>
                        : <span className="text-xs text-gray-300">no bib</span>
                      }
                      <span className={`text-xs ${r.paymentStatus === 'PAID' ? 'text-green-500' : 'text-amber-500'}`}>
                        {r.paymentStatus === 'PAID' ? '✓ paid' : '⚠ unpaid'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ── Column 2: Search / QR ── */}
          <Card className="self-start">
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
                  <Button onClick={() => lookupMutation.mutate(search)} disabled={!search || lookupMutation.isPending}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Column 3: Action panel ── */}
          {selected ? (
            <Card className="self-start">
              <CardHeader>
                <CardTitle className="text-base">{selected.participant?.fullName ?? 'Participant'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Bib</span>
                  <span className="font-mono font-semibold">#{selected.bibNumber ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Payment</span>
                  {paymentBadge(selected.paymentStatus ?? 'PENDING')}
                </div>

                {/* Assign bib */}
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 space-y-2">
                  <p className="text-sm font-medium text-blue-700">Assign Bib Number</p>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder={selected.bibNumber ? `Current: #${selected.bibNumber}` : 'Enter bib number…'}
                      value={bibInput}
                      onChange={(e) => setBibInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && bibInput.trim())
                          assignBibMutation.mutate({ id: selected.id, bibNumber: bibInput.trim() });
                      }}
                      className="bg-white"
                    />
                    <Button
                      onClick={() => assignBibMutation.mutate({ id: selected.id, bibNumber: bibInput.trim() })}
                      disabled={!bibInput.trim() || assignBibMutation.isPending}
                      className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {assignBibMutation.isPending ? '…' : 'Assign'}
                    </Button>
                  </div>
                </div>

                {/* Payment */}
                {canCollectOnsite ? (
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
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700 font-medium">
                    <CheckCircle className="h-4 w-4" /> Payment received
                  </div>
                )}

                {/* Items */}
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
                              disabled={distributeMutation.isPending}
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
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-center p-8">
              <User className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">Select a participant from the list</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
