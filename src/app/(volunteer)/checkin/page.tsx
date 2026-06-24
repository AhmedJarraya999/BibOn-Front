'use client';
import { useState } from 'react';
import { Search, CheckCircle, XCircle, QrCode, Hash } from 'lucide-react';
import api from '@/lib/api';
import { type Registration } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrScanner } from '@/components/checkin/qr-scanner';
import { useToast } from '@/components/ui/toast';

type Mode = 'qr' | 'bib';

export default function CheckInPage() {
  const [mode, setMode] = useState<Mode>('qr');
  const [raceId, setRaceId] = useState('');
  const [bibNumber, setBibNumber] = useState('');
  const [result, setResult] = useState<Registration | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInDone, setCheckInDone] = useState(false);
  const toast = useToast();

  const reset = () => {
    setResult(null);
    setError('');
    setCheckInDone(false);
    setBibNumber('');
  };

  // Called when QR code is scanned — contains registration ID
  const handleQrScan = async (registrationId: string) => {
    setLoading(true);
    setError('');
    setResult(null);
    setCheckInDone(false);
    try {
      const res = await api.get(`/registrations/${registrationId}`);
      setResult(res.data);
    } catch {
      setError('Registration not found for this QR code.');
    } finally {
      setLoading(false);
    }
  };

  // Called when bib number is submitted manually
  const handleBibLookup = async () => {
    if (!raceId || !bibNumber) return;
    setLoading(true);
    setError('');
    setResult(null);
    setCheckInDone(false);
    try {
      const res = await api.get(`/races/${raceId}/registrations/by-bib/${bibNumber}`);
      setResult(res.data);
    } catch {
      setError('Registration not found for this bib number.');
    } finally {
      setLoading(false);
    }
  };

  const checkIn = async () => {
    if (!result) return;
    setCheckInLoading(true);
    try {
      await api.patch(`/registrations/${result.id}/check-in`);
      setCheckInDone(true);
      setResult((prev) => prev ? { ...prev, status: 'CHECKED_IN' } : prev);
      toast.success(`Bib #${result.bibNumber} checked in!`);
    } catch {
      toast.error('Check-in failed.');
    } finally {
      setCheckInLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Check-in</h1>

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
        <button
          onClick={() => { setMode('qr'); reset(); }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'qr' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <QrCode className="h-4 w-4" /> Scan QR Code
        </button>
        <button
          onClick={() => { setMode('bib'); reset(); }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'bib' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Hash className="h-4 w-4" /> Bib Number
        </button>
      </div>

      {/* QR scan mode */}
      {mode === 'qr' && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-gray-500 text-center">
              Point the camera at the participant's QR code on their bib or confirmation email.
            </p>
            <QrScanner onScan={handleQrScan} />
            {loading && <p className="text-center text-sm text-gray-500">Looking up registration…</p>}
          </CardContent>
        </Card>
      )}

      {/* Bib number mode */}
      {mode === 'bib' && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Race ID</label>
              <Input
                placeholder="Enter race ID"
                value={raceId}
                onChange={(e) => setRaceId(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Bib Number</label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 42"
                  value={bibNumber}
                  onChange={(e) => setBibNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBibLookup()}
                />
                <Button onClick={handleBibLookup} disabled={loading}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
          <XCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {result.participant?.fullName ?? 'Participant'}
              </h2>
              <Badge variant={result.status === 'CHECKED_IN' ? 'success' : 'info'}>
                {result.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Bib Number</p>
                <p className="font-mono font-semibold text-gray-900">{result.bibNumber}</p>
              </div>
              {result.participant?.email && (
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-gray-700 truncate">{result.participant.email}</p>
                </div>
              )}
            </div>

            {checkInDone ? (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <p className="text-sm font-medium">Successfully checked in!</p>
              </div>
            ) : result.status === 'CHECKED_IN' ? (
              <p className="text-sm text-gray-500 text-center py-2">Already checked in.</p>
            ) : (
              <Button className="w-full" onClick={checkIn} disabled={checkInLoading}>
                {checkInLoading ? 'Checking in…' : `Check In Bib #${result.bibNumber}`}
              </Button>
            )}

            <button
              onClick={reset}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
            >
              Scan another
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
