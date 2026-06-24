'use client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Users, CheckCircle, Clock } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';

interface AttendanceData {
  totalRegistered: number;
  checkedIn: number;
  notArrived: number;
}

interface Race { id: string; name: string; distance: number; }

export default function AttendancePage() {
  const [selectedRaceId, setSelectedRaceId] = useState('');

  const { data: racesData } = useQuery({
    queryKey: ['races-all'],
    queryFn: () => api.get('/races', { params: { limit: 200 } }).then((r) => r.data),
  });
  const races: Race[] = racesData?.data ?? [];

  const { data: attendance, isLoading } = useQuery<AttendanceData>({
    queryKey: ['attendance', selectedRaceId],
    queryFn: () => api.get(`/races/${selectedRaceId}/attendance`).then((r) => r.data),
    enabled: !!selectedRaceId,
  });

  const checkedInPct = attendance
    ? Math.round((attendance.checkedIn / (attendance.totalRegistered || 1)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Race-Day Attendance</h1>

      <div className="max-w-sm">
        <Label>Select Race</Label>
        <select
          className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedRaceId}
          onChange={(e) => setSelectedRaceId(e.target.value)}
        >
          <option value="">Choose a race…</option>
          {races.map((r) => (
            <option key={r.id} value={r.id}>{r.name} ({r.distance} km)</option>
          ))}
        </select>
      </div>

      {selectedRaceId && (
        isLoading ? (
          <div className="space-y-6">
            <StatCardSkeleton />
            <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ) : attendance ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    <Users className="h-4 w-4" /> Total Registered
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-gray-900">{attendance.totalRegistered}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-green-600">
                    <CheckCircle className="h-4 w-4" /> Checked In
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">{attendance.checkedIn}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-yellow-600">
                    <Clock className="h-4 w-4" /> Not Arrived
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-yellow-600">{attendance.notArrived}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-700">Check-in Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1 rounded-full bg-gray-100 h-4 overflow-hidden">
                    <div
                      className="h-4 rounded-full bg-green-500 transition-all duration-500"
                      style={{ width: `${checkedInPct}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-12 text-right">{checkedInPct}%</span>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {attendance.checkedIn} of {attendance.totalRegistered} participants have checked in
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null
      )}

      {!selectedRaceId && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-20 text-center">
          <Users className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500">Select a race above to view attendance</p>
        </div>
      )}
    </div>
  );
}
