'use client';
import { useState } from 'react';
import { Search, CheckCircle, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { type Registration } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function CheckInPage() {
  const [raceId, setRaceId] = useState('');
  const [bibNumber, setBibNumber] = useState('');
  const [result, setResult] = useState<Registration | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInDone, setCheckInDone] = useState(false);

  const lookup = async () => {
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
    } catch {
      setError('Check-in failed.');
    } finally {
      setCheckInLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Check-in</h1>

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
                onKeyDown={(e) => e.key === 'Enter' && lookup()}
              />
              <Button onClick={lookup} disabled={loading}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
          <XCircle className="h-5 w-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {result && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{result.participant?.fullName ?? 'Participant'}</h2>
              <Badge variant={result.status === 'CHECKED_IN' ? 'success' : 'info'}>{result.status}</Badge>
            </div>
            <p className="text-sm text-gray-500">Bib: <span className="font-mono font-medium text-gray-900">{result.bibNumber}</span></p>
            {result.participant?.email && (
              <p className="text-sm text-gray-500">Email: {result.participant.email}</p>
            )}

            {checkInDone ? (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <p className="text-sm font-medium">Successfully checked in!</p>
              </div>
            ) : result.status !== 'CHECKED_IN' ? (
              <Button className="w-full" onClick={checkIn} disabled={checkInLoading}>
                {checkInLoading ? 'Checking in…' : 'Check In'}
              </Button>
            ) : (
              <p className="text-sm text-gray-500">Already checked in.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
