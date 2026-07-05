'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HeartPulse, Search, QrCode, Phone, AlertTriangle, X, CheckCircle, User } from 'lucide-react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { type Race, type Registration } from '@/types';
import { useToast } from '@/components/ui/toast';
import { CountryFlag } from '@/components/ui/country-flag';
import { sounds } from '@/lib/sounds';
import { Badge } from '@/components/ui/badge';

const QrScanner = dynamic(() => import('@/components/checkin/qr-scanner').then((m) => m.QrScanner), { ssr: false });

const SEVERITY_OPTIONS = [
  { value: 'MINOR', label: 'Minor', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'MODERATE', label: 'Moderate', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'SERIOUS', label: 'Serious', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 text-red-700 border-red-300' },
];

export default function MedicalPage() {
  const [raceId, setRaceId] = useState('');
  const [bibInput, setBibInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState<Registration | null>(null);
  const [dnfReason, setDnfReason] = useState('');
  const [showDnfForm, setShowDnfForm] = useState(false);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentForm, setIncidentForm] = useState({ severity: 'MINOR', location: '', description: '', actionTaken: '' });

  const bibRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (raceId) setTimeout(() => bibRef.current?.focus(), 100);
  }, [raceId]);

  const { data: racesData } = useQuery({
    queryKey: ['races-medical'],
    queryFn: () => api.get('/races', { params: { limit: 100 } }).then((r) => r.data),
  });
  const races: Race[] = racesData?.data ?? [];

  const lookupByBib = async (bib: string) => {
    if (!bib || !raceId) return;
    try {
      const res = await api.get('/medical/lookup', { params: { raceId, bib } });
      setSelected(res.data);
      sounds.success();
      setBibInput('');
    } catch {
      sounds.error();
      toast.error(`Bib #${bib} not found.`);
      bibRef.current?.focus();
    }
  };

  const lookupById = async (id: string) => {
    try {
      const res = await api.get(`/medical/registration/${id}`);
      setSelected(res.data);
      sounds.success();
    } catch {
      sounds.error();
      toast.error('Registration not found.');
    }
  };

  const dnfMutation = useMutation({
    mutationFn: () => api.post(`/registrations/${selected!.id}/dnf`, { reason: dnfReason }),
    onSuccess: () => {
      sounds.success();
      toast.success('DNF recorded.');
      setShowDnfForm(false);
      setDnfReason('');
      if (selected) lookupById(selected.id);
    },
    onError: () => { sounds.error(); toast.error('Could not record DNF.'); },
  });

  const incidentMutation = useMutation({
    mutationFn: () => api.post('/medical/incidents', { ...incidentForm, registrationId: selected!.id }),
    onSuccess: () => {
      sounds.success();
      toast.success('Incident logged.');
      setShowIncidentForm(false);
      setIncidentForm({ severity: 'MINOR', location: '', description: '', actionTaken: '' });
      if (selected) lookupById(selected.id);
    },
    onError: () => { sounds.error(); toast.error('Could not log incident.'); },
  });

  const handleQrScan = (code: string) => {
    setScanning(false);
    try {
      const p = JSON.parse(code);
      lookupById(p.registrationId ?? code);
    } catch {
      lookupById(code);
    }
    setTimeout(() => bibRef.current?.focus(), 100);
  };

  const participant = selected?.participant as any;
  const incidents = (selected as any)?.medicalIncidents ?? [];
  const statusColor: Record<string, string> = {
    REGISTERED: 'info', CHECKED_IN: 'info', FINISHED: 'success', DNF: 'warning', DISQUALIFIED: 'danger',
  };

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <HeartPulse className="h-6 w-6 text-red-500 shrink-0" />
        <h1 className="text-2xl font-bold text-gray-900">Medical Station</h1>
        <select
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          value={raceId}
          onChange={(e) => { setRaceId(e.target.value); setSelected(null); setBibInput(''); }}
        >
          <option value="">Select a race…</option>
          {races.map((r) => <option key={r.id} value={r.id}>{r.name} — {r.distance} km</option>)}
        </select>
      </div>

      {!raceId ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-24 text-center">
          <HeartPulse className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500">Select a race to start</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 flex-1 min-h-0">

          {/* Left: bib lookup */}
          <div className="flex flex-col gap-4">

            {/* Bib input hero */}
            <div className="rounded-xl border-2 border-red-300 bg-white p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Scan or enter bib number</p>
              <div className="flex gap-2">
                <input
                  ref={bibRef}
                  inputMode="numeric"
                  placeholder="Bib #"
                  value={bibInput}
                  onChange={(e) => setBibInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') lookupByBib(bibInput.trim()); }}
                  className="flex-1 rounded-lg border-2 border-gray-200 px-4 text-4xl font-black tracking-widest text-center focus:border-red-400 focus:outline-none h-20"
                  autoComplete="off"
                  autoFocus
                />
                <button
                  onClick={() => lookupByBib(bibInput.trim())}
                  disabled={!bibInput.trim()}
                  className="w-20 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-30 text-white text-3xl font-black transition-colors"
                >
                  →
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center">Press Enter to look up</p>
            </div>

            {/* QR secondary */}
            <button
              onClick={() => setScanning(true)}
              className="flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 py-4 text-sm font-medium text-gray-500 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <QrCode className="h-5 w-5" />
              Or scan QR code
            </button>
            {scanning && (
              <QrScanner onScan={handleQrScan} onClose={() => { setScanning(false); setTimeout(() => bibRef.current?.focus(), 100); }} />
            )}

            {/* DNF form */}
            {showDnfForm && selected && (
              <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-orange-800">Record DNF for {participant?.fullName}</p>
                <input
                  className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Reason (optional) — e.g. knee injury, exhaustion…"
                  value={dnfReason}
                  onChange={(e) => setDnfReason(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => dnfMutation.mutate()}
                    disabled={dnfMutation.isPending}
                    className="flex-1 h-10 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors"
                  >
                    {dnfMutation.isPending ? 'Saving…' : 'Confirm DNF'}
                  </button>
                  <button onClick={() => setShowDnfForm(false)} className="h-10 px-4 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Incident form */}
            {showIncidentForm && selected && (
              <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-red-800">Log Incident — {participant?.fullName}</p>
                <div className="grid grid-cols-2 gap-2">
                  {SEVERITY_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setIncidentForm((f) => ({ ...f, severity: s.value }))}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${incidentForm.severity === s.value ? s.color : 'bg-white border-gray-200 text-gray-500'}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <input
                  className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm focus:outline-none"
                  placeholder="Location (e.g. km 12, water station)"
                  value={incidentForm.location}
                  onChange={(e) => setIncidentForm((f) => ({ ...f, location: e.target.value }))}
                />
                <textarea
                  className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm focus:outline-none resize-none"
                  rows={2}
                  placeholder="What happened? *"
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm((f) => ({ ...f, description: e.target.value }))}
                />
                <textarea
                  className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm focus:outline-none resize-none"
                  rows={2}
                  placeholder="Action taken (treatment, evacuation…)"
                  value={incidentForm.actionTaken}
                  onChange={(e) => setIncidentForm((f) => ({ ...f, actionTaken: e.target.value }))}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => incidentMutation.mutate()}
                    disabled={!incidentForm.description.trim() || incidentMutation.isPending}
                    className="flex-1 h-10 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-30 text-white font-bold text-sm"
                  >
                    {incidentMutation.isPending ? 'Saving…' : 'Log Incident'}
                  </button>
                  <button onClick={() => setShowIncidentForm(false)} className="h-10 px-4 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: health card */}
          {selected ? (
            <div className="flex flex-col rounded-xl border-2 border-gray-200 bg-white overflow-hidden">

              {/* Participant header */}
              <div className={`px-5 py-4 border-b ${selected.status === 'DNF' ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xl font-black text-gray-900">{participant?.fullName}</p>
                    <p className="text-sm text-gray-500">{participant?.email}</p>
                    {participant?.phone && <p className="text-sm text-gray-500">{participant.phone}</p>}
                    {participant?.country && <CountryFlag country={participant.country} size={15} className="mt-1" />}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={statusColor[selected.status] as any ?? 'info'}>{selected.status}</Badge>
                    {selected.bibNumber && <span className="text-sm font-mono font-bold text-blue-600">#{selected.bibNumber}</span>}
                  </div>
                </div>
              </div>

              {/* Medical card */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">

                {/* Critical info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-xl p-3 text-center border-2 ${participant?.bloodType ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Blood Type</p>
                    <p className={`text-3xl font-black mt-1 ${participant?.bloodType ? 'text-red-600' : 'text-gray-300'}`}>
                      {participant?.bloodType ?? '?'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Emergency Contact</p>
                    {participant?.emergencyContact ? (
                      <>
                        <p className="text-sm font-semibold text-gray-900">{participant.emergencyContact}</p>
                        {participant?.emergencyPhone && (
                          <a
                            href={`tel:${participant.emergencyPhone}`}
                            className="mt-1 flex items-center gap-1 text-sm text-blue-600 font-medium hover:underline"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {participant.emergencyPhone}
                          </a>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Not provided</p>
                    )}
                  </div>
                </div>

                {/* Medical conditions */}
                {participant?.medicalConditions ? (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">⚠ Medical Conditions</p>
                    <p className="text-sm text-amber-900">{participant.medicalConditions}</p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                    <p className="text-xs text-gray-400 italic">No medical conditions reported</p>
                  </div>
                )}

                {/* Actions */}
                {selected.status !== 'DNF' && selected.status !== 'FINISHED' && !showDnfForm && !showIncidentForm && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowDnfForm(true); setShowIncidentForm(false); }}
                      className="flex-1 h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors"
                    >
                      Record DNF
                    </button>
                    <button
                      onClick={() => { setShowIncidentForm(true); setShowDnfForm(false); }}
                      className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors"
                    >
                      Log Incident
                    </button>
                  </div>
                )}

                {selected.status === 'DNF' && (
                  <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 text-orange-700 font-semibold text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Marked as DNF
                  </div>
                )}

                {/* Incident history */}
                {incidents.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Incident Log</p>
                    {incidents.map((inc: any) => (
                      <div key={inc.id} className={`rounded-lg border p-3 text-sm space-y-1 ${
                        inc.severity === 'CRITICAL' ? 'bg-red-50 border-red-200' :
                        inc.severity === 'SERIOUS' ? 'bg-orange-50 border-orange-200' :
                        inc.severity === 'MODERATE' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{inc.severity}</span>
                          <span className="text-xs text-gray-400">{new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {inc.location && <p className="text-gray-600">📍 {inc.location}</p>}
                        <p className="text-gray-800">{inc.description}</p>
                        {inc.actionTaken && <p className="text-gray-600 italic">→ {inc.actionTaken}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Clear button */}
              <div className="px-5 py-3 border-t border-gray-100 shrink-0">
                <button
                  onClick={() => { setSelected(null); setBibInput(''); setShowDnfForm(false); setShowIncidentForm(false); setTimeout(() => bibRef.current?.focus(), 100); }}
                  className="w-full h-9 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
                >
                  Clear — scan next runner
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-gray-300 text-center p-8">
              <User className="h-10 w-10 mb-2" />
              <p className="text-sm">Enter bib number to pull up health card</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
