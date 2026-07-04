'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, QrCode, CheckCircle, User, RotateCcw, Package, AlertTriangle, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { CountryFlag } from '@/components/ui/country-flag';
import { type Race, type Registration } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { Banknote } from 'lucide-react';
import { VolunteerStats } from '@/components/volunteer/volunteer-stats';
import { useRecentActions } from '@/hooks/use-recent-actions';
import { sounds } from '@/lib/sounds';

const QrScanner = dynamic(() => import('@/components/checkin/qr-scanner').then((m) => m.QrScanner), { ssr: false });

export default function DistributionPage() {
  const [raceId, setRaceId] = useState('');
  const [search, setSearch] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [selected, setSelected] = useState<Registration | null>(null);
  const [scanning, setScanning] = useState(false);
  const [bibInput, setBibInput] = useState('');
  const [statsKey, setStatsKey] = useState(0);
  const [justDone, setJustDone] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const bibRef = useRef<HTMLInputElement>(null);

  const toast = useToast();
  const queryClient = useQueryClient();
  const { actions, push: pushAction, remove: removeAction } = useRecentActions();

  useEffect(() => { if (raceId) setTimeout(() => searchRef.current?.focus(), 100); }, [raceId]);

  const { data: racesData } = useQuery({
    queryKey: ['races-dist'],
    queryFn: () => api.get('/races', { params: { limit: 100 } }).then((r) => r.data),
  });
  const races: Race[] = racesData?.data ?? [];

  const { data: allRegsData, isLoading: listLoading } = useQuery({
    queryKey: ['dist-all-regs', raceId],
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
          (r.participant as any)?.phone?.toLowerCase().includes(q) ||
          r.bibNumber?.toLowerCase().includes(q)
        );
      })
    : allRegs;

  function refreshAll() {
    queryClient.invalidateQueries({ queryKey: ['dist-all-regs', raceId] });
    setStatsKey((k) => k + 1);
  }

  const lookupById = async (id: string) => {
    try {
      const res = await api.get(`/registrations/${id}`);
      setSelected(res.data);
      setJustDone(false);
      setBibInput('');
      setTimeout(() => bibRef.current?.focus(), 150);
    } catch {
      sounds.error();
      toast.error('Registration not found.');
    }
  };

  const lookupMutation = useMutation({
    mutationFn: (q: string) =>
      api.get('/registrations/lookup', { params: { raceId, search: q } }).then((r) => r.data),
    onSuccess: (data: Registration[]) => {
      if (data.length === 1) {
        setSelected(data[0]);
        setJustDone(false);
        setBibInput('');
        sounds.success();
        setTimeout(() => bibRef.current?.focus(), 150);
      } else if (data.length > 1) {
        // show multiple results inline — handled in JSX
        setSelected(null);
        setMultiResults(data);
      } else {
        sounds.error();
        toast.error('No participant found. Try their email or phone number.');
      }
    },
  });

  const [multiResults, setMultiResults] = useState<Registration[]>([]);
  const [reclamationOpen, setReclamationOpen] = useState(false);
  const [reclamationForm, setReclamationForm] = useState({ name: '', phone: '', note: '', proofDescription: '', temporaryBib: '' });

  const handleQrScan = (code: string) => {
    setScanning(false);
    sounds.success();
    setSearch('');
    setMultiResults([]);
    try {
      const parsed = JSON.parse(code);
      lookupById(parsed.registrationId ?? code);
    } catch {
      lookupById(code);
    }
  };

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/registrations/${id}`, { paymentStatus: 'PAID' }),
    onSuccess: (res) => {
      setSelected(res.data);
      sounds.success();
      refreshAll();
      pushAction(`💵 ${res.data.participant?.fullName} — payment recorded`, async () => {
        await api.patch(`/registrations/${res.data.id}`, { paymentStatus: 'PENDING' });
        refreshAll();
      });
      setTimeout(() => bibRef.current?.focus(), 100);
    },
    onError: () => { sounds.error(); toast.error('Could not record payment.'); },
  });

  const assignBibMutation = useMutation({
    mutationFn: ({ id, bibNumber }: { id: string; bibNumber: string }) =>
      api.patch(`/registrations/${id}`, { bibNumber }),
    onSuccess: (res) => {
      const prev = selected;
      setSelected(res.data);
      setBibInput('');
      setJustDone(true);
      sounds.success();
      refreshAll();
      pushAction(
        `📦 ${res.data.participant?.fullName} — bib #${res.data.bibNumber} assigned`,
        async () => {
          await api.patch(`/registrations/${res.data.id}`, { bibNumber: prev?.bibNumber ?? null });
          refreshAll();
        },
      );
      // Auto-focus back to search after short delay so volunteer can move to next person
      setTimeout(() => {
        setSelected(null);
        setJustDone(false);
        setSearch('');
        setMultiResults([]);
        searchRef.current?.focus();
      }, 1800);
    },
    onError: () => { sounds.error(); toast.error('Could not assign bib number.'); },
  });

  const reclamationMutation = useMutation({
    mutationFn: (form: typeof reclamationForm) => {
      const race = races.find((r) => r.id === raceId);
      return api.post('/reclamations', {
        ...form,
        eventId: (race as any)?.eventId ?? '',
        raceId,
      });
    },
    onSuccess: () => {
      sounds.success();
      toast.success('Reclamation recorded. Race director will follow up.');
      setReclamationOpen(false);
      setReclamationForm({ name: '', phone: '', note: '', proofDescription: '', temporaryBib: '' });
    },
    onError: () => { sounds.error(); toast.error('Could not save reclamation.'); },
  });

  const bibAlreadyAssigned = !!selected?.bibNumber;

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Bib Distribution</h1>
        <select
          className="h-9 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={raceId}
          onChange={(e) => { setRaceId(e.target.value); setSelected(null); setBibInput(''); setMultiResults([]); }}
        >
          <option value="">Select a race…</option>
          {races.map((r) => (
            <option key={r.id} value={r.id}>{r.name} — {r.distance} km</option>
          ))}
        </select>
      </div>

      {!raceId ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-24 text-center">
          <Package className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500">Select a race to start</p>
        </div>
      ) : (
        <>
          {/* Live stats */}
          <VolunteerStats raceId={raceId} refreshKey={statsKey} />

          {/* Undo strip */}
          {actions.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs text-gray-400 shrink-0">Recent:</span>
              {actions.map((a) => (
                <div key={a.id} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs text-gray-600 shrink-0">
                  <span className="max-w-[200px] truncate">{a.label}</span>
                  {a.undo && (
                    <button
                      onClick={async () => { await a.undo?.(); sounds.undo(); removeAction(a.id); refreshAll(); toast.success('Undone.'); }}
                      className="text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-0.5 ml-1"
                    >
                      <RotateCcw className="h-3 w-3" /> Undo
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_360px] gap-4 min-h-0 flex-1">

            {/* Col 1: participant list */}
            <div className="flex flex-col border border-gray-200 rounded-xl bg-white overflow-hidden">
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                  <input
                    className="w-full rounded-md border border-gray-200 pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Filter list…"
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {filteredRegs.filter((r) => !r.bibNumber).length} need bib · {filteredRegs.length} total
                </p>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                {listLoading ? (
                  <div className="p-4 text-center text-sm text-gray-400">Loading…</div>
                ) : filteredRegs.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-400">No participants found</div>
                ) : (
                  filteredRegs.map((r) => {
                    const done = !!r.bibNumber;
                    return (
                      <button
                        key={r.id}
                        onClick={() => { setSelected(r); setJustDone(false); setBibInput(''); setMultiResults([]); lookupById(r.id); }}
                        className={`w-full text-left px-3 py-2.5 transition-colors border-l-2 ${
                          selected?.id === r.id
                            ? 'bg-blue-50 border-blue-500'
                            : 'border-transparent hover:bg-gray-50'
                        } ${done ? 'opacity-40' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {r.participant?.fullName ?? r.participant?.email ?? '—'}
                          </span>
                          {done && <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0 ml-auto" />}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 pl-5 flex-wrap">
                          {r.bibNumber
                            ? <span className="text-xs font-mono font-semibold text-blue-600">#{r.bibNumber}</span>
                            : <span className="text-xs text-amber-500 font-medium">needs bib</span>
                          }
                          <span className={`text-xs ${r.paymentStatus === 'PAID' ? 'text-green-500' : 'text-gray-400'}`}>
                            · {r.paymentStatus === 'PAID' ? '✓ paid' : 'unpaid'}
                          </span>
                          {r.lieuDeRetrait && (
                            <span className="text-xs text-blue-500 truncate">📍 {r.lieuDeRetrait}</span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Col 2: search hero */}
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border-2 border-blue-300 bg-white p-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Find Participant</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      ref={searchRef}
                      className="w-full rounded-lg border-2 border-gray-200 pl-12 pr-4 h-16 text-xl font-semibold focus:border-blue-400 focus:outline-none"
                      placeholder="Name, email, phone or bib #…"
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setMultiResults([]); }}
                      onKeyDown={(e) => e.key === 'Enter' && search.trim() && lookupMutation.mutate(search.trim())}
                      autoComplete="off"
                    />
                  </div>
                  <button
                    onClick={() => lookupMutation.mutate(search.trim())}
                    disabled={!search.trim() || lookupMutation.isPending}
                    className="h-16 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white text-lg font-bold transition-colors"
                  >
                    {lookupMutation.isPending ? '…' : '→'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 text-center">Press Enter to search</p>
              </div>

              {/* QR scan secondary */}
              <button
                onClick={() => setScanning(true)}
                className="flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 py-4 text-sm font-medium text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <QrCode className="h-5 w-5" />
                Or scan QR code
              </button>
              {scanning && (
                <QrScanner onScan={handleQrScan} onClose={() => { setScanning(false); setTimeout(() => searchRef.current?.focus(), 100); }} />
              )}

              {/* Multiple results */}
              {multiResults.length > 1 && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
                  <p className="text-xs text-gray-500 font-medium">{multiResults.length} results — select one:</p>
                  {multiResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => { setSelected(r); setMultiResults([]); setJustDone(false); setBibInput(''); lookupById(r.id); }}
                      className="w-full text-left rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-900">{r.participant?.fullName}</span>
                      <span className="ml-2 text-xs text-gray-400">{r.participant?.email}</span>
                      {r.bibNumber && <span className="ml-2 text-xs font-mono text-blue-600">#{r.bibNumber}</span>}
                    </button>
                  ))}
                </div>
              )}

              {/* Reclamation trigger */}
              <div className="mt-auto pt-2">
                <button
                  onClick={() => setReclamationOpen(true)}
                  className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-medium"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Can't find this person? — Flag a reclamation
                </button>
              </div>
            </div>

            {/* Col 3: participant action card */}
            {selected ? (
              <div className={`flex flex-col rounded-xl border-2 bg-white p-5 gap-4 transition-colors ${justDone ? 'border-green-400' : 'border-gray-200'}`}>

                {/* Success flash */}
                {justDone && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-700 font-semibold text-sm">
                    <CheckCircle className="h-5 w-5 shrink-0" />
                    Bib #{selected.bibNumber} → {selected.participant?.fullName} ✓
                  </div>
                )}

                {/* Participant info */}
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-lg font-bold text-gray-900 leading-tight">{selected.participant?.fullName}</div>
                    <Badge variant={selected.paymentStatus === 'PAID' ? 'success' : 'warning'} className="shrink-0">
                      {selected.paymentStatus === 'PAID' ? '✓ Paid' : 'Unpaid'}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-400">{selected.participant?.email}</div>
                  {(selected.participant as any)?.phone && (
                    <div className="text-sm text-gray-400">{(selected.participant as any).phone}</div>
                  )}
                  {selected.participant?.country && (
                    <CountryFlag country={selected.participant.country} size={16} />
                  )}
                  {selected.lieuDeRetrait && (
                    <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-sm font-medium text-blue-700">
                      📍 {selected.lieuDeRetrait}
                    </div>
                  )}
                  {selected.bibNumber && (
                    <div className="text-sm font-mono font-bold text-blue-600">Current bib: #{selected.bibNumber}</div>
                  )}
                </div>

                {/* Step 1: Payment gate */}
                {!justDone && selected.paymentStatus !== 'PAID' && (
                  <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
                      <Banknote className="h-4 w-4" />
                      Collect payment first
                    </div>
                    <Button
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-base h-14"
                      onClick={() => markPaidMutation.mutate(selected.id)}
                      disabled={markPaidMutation.isPending}
                    >
                      {markPaidMutation.isPending ? 'Recording…' : '💵 Mark as Paid'}
                    </Button>
                  </div>
                )}

                {/* Step 2: Assign bib */}
                {!justDone && selected.paymentStatus === 'PAID' && (
                  <div className={`rounded-lg p-4 space-y-3 ${bibAlreadyAssigned ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border-2 border-blue-400'}`}>
                    <div className="text-sm font-semibold text-gray-700">
                      {bibAlreadyAssigned ? `⚠ Has bib #${selected.bibNumber} — reassign?` : '✓ Paid — Enter Bib Number'}
                    </div>
                    <div className="flex gap-2">
                      <input
                        ref={bibRef}
                        type="text"
                        inputMode="numeric"
                        placeholder="Bib #"
                        value={bibInput}
                        onChange={(e) => setBibInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && bibInput.trim())
                            assignBibMutation.mutate({ id: selected.id, bibNumber: bibInput.trim() });
                        }}
                        className="flex-1 rounded-lg border-2 border-gray-200 bg-white px-3 h-14 text-2xl font-black tracking-widest text-center focus:border-blue-400 focus:outline-none"
                        autoComplete="off"
                      />
                      <button
                        onClick={() => assignBibMutation.mutate({ id: selected.id, bibNumber: bibInput.trim() })}
                        disabled={!bibInput.trim() || assignBibMutation.isPending}
                        className="h-14 w-14 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white text-2xl font-black transition-colors"
                      >
                        {assignBibMutation.isPending ? '…' : '✓'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400">Press Enter · auto-advances after assign</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-center p-8 text-gray-300">
                <User className="h-10 w-10 mb-2" />
                <p className="text-sm">Search or scan to find a participant</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Reclamation modal */}
      {reclamationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2 font-semibold text-gray-900">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Flag Reclamation
              </div>
              <button onClick={() => setReclamationOpen(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-500">
                Participant claims to have registered online but is not found in the system. Fill in their details and the race director will follow up.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full name *</label>
                <Input
                  placeholder="Participant's full name"
                  value={reclamationForm.name}
                  onChange={(e) => setReclamationForm((f) => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone number</label>
                <Input
                  placeholder="+216 XX XXX XXX"
                  value={reclamationForm.phone}
                  onChange={(e) => setReclamationForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Proof of registration</label>
                <Input
                  placeholder="e.g. confirmation email, order #, payment screenshot…"
                  value={reclamationForm.proofDescription}
                  onChange={(e) => setReclamationForm((f) => ({ ...f, proofDescription: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Temporary bib assigned <span className="text-gray-400">(optional)</span></label>
                <Input
                  placeholder="e.g. 9001"
                  inputMode="numeric"
                  value={reclamationForm.temporaryBib}
                  onChange={(e) => setReclamationForm((f) => ({ ...f, temporaryBib: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  rows={2}
                  placeholder="Any additional context…"
                  value={reclamationForm.note}
                  onChange={(e) => setReclamationForm((f) => ({ ...f, note: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                  disabled={!reclamationForm.name.trim() || reclamationMutation.isPending}
                  onClick={() => reclamationMutation.mutate(reclamationForm)}
                >
                  {reclamationMutation.isPending ? 'Saving…' : 'Submit Reclamation'}
                </Button>
                <Button variant="outline" onClick={() => setReclamationOpen(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
