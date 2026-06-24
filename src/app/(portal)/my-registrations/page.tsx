'use client';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Clock, Flag, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { type Registration, type Participant } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton, Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/utils';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  REGISTERED: 'info',
  CHECKED_IN: 'success',
  DNS: 'warning',
  DNF: 'danger',
  FINISHED: 'success',
  DISQUALIFIED: 'danger',
};

const statusIcon: Record<string, React.ReactNode> = {
  REGISTERED: <Clock className="h-4 w-4" />,
  CHECKED_IN: <CheckCircle className="h-4 w-4" />,
  DNS: <AlertCircle className="h-4 w-4" />,
  DNF: <XCircle className="h-4 w-4" />,
  FINISHED: <Trophy className="h-4 w-4" />,
  DISQUALIFIED: <XCircle className="h-4 w-4" />,
};

export default function MyRegistrationsPage() {
  const { data: participant, isLoading: profileLoading, error: profileError } = useQuery<Participant>({
    queryKey: ['participant-me'],
    queryFn: () => api.get('/participants/me').then((r) => r.data),
  });

  const { data: registrationsData, isLoading: regsLoading } = useQuery({
    queryKey: ['my-registrations', participant?.id],
    queryFn: () =>
      api.get('/registrations', { params: { participantId: participant!.id, limit: 50 } }).then((r) => r.data),
    enabled: !!participant?.id,
  });

  const registrations: Registration[] = registrationsData?.data ?? [];

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <TableSkeleton rows={4} cols={4} />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-yellow-400 mb-3" />
        <h2 className="text-lg font-semibold text-gray-900">No participant profile found</h2>
        <p className="mt-1 text-sm text-gray-500">
          Your account is not yet linked to a participant profile. Contact the event organizer.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Registrations</h1>

      {/* Profile card */}
      {participant && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-700">Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-gray-400">Name</p>
                <p className="text-sm font-medium text-gray-900">{participant.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-sm font-medium text-gray-900">{participant.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Gender</p>
                <p className="text-sm font-medium text-gray-900">{participant.gender === 'M' ? 'Male' : 'Female'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Total Races</p>
                <p className="text-sm font-medium text-gray-900">{registrations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registrations */}
      {regsLoading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : registrations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-20 text-center">
          <Flag className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500">You have no registrations yet.</p>
          <p className="mt-1 text-sm text-gray-400">Contact your event organizer to register for a race.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {registrations.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold text-lg">
                      {r.bibNumber}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{r.race?.name ?? 'Race'}</p>
                      <p className="text-sm text-gray-500">
                        {r.race?.distance ? `${r.race.distance} km` : ''}
                        {r.race?.startTime ? ` · ${formatDateTime(r.race.startTime)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{statusIcon[r.status]}</span>
                    <Badge variant={statusVariant[r.status] ?? 'default'}>{r.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
