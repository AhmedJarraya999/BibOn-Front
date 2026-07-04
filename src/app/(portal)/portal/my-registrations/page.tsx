'use client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Trophy, Clock, Flag, CheckCircle, XCircle, AlertCircle, CreditCard, QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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

const paymentVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  PAID: 'success',
  PENDING: 'warning',
  FAILED: 'danger',
};

function QRModal({ registration, onClose }: { registration: Registration; onClose: () => void }) {
  const qrData = JSON.stringify({
    registrationId: registration.id,
    bibNumber: registration.bibNumber,
    participant: registration.participant?.fullName,
    race: registration.race?.name,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100">
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Your Race Pass</p>
          {(registration.race as any)?.event?.name && (
            <p className="text-xs text-blue-600 font-medium mt-0.5">{(registration.race as any).event.name}</p>
          )}
          <h2 className="mt-1 text-xl font-bold text-gray-900">{registration.race?.name}</h2>
          <p className="text-sm text-gray-500">{registration.participant?.fullName}</p>
        </div>

        {/* Bib number */}
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-white">
          <div>
            <p className="text-xs font-semibold opacity-70">BIB</p>
            <p className="text-2xl font-black leading-none">{registration.bibNumber ?? '—'}</p>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex justify-center rounded-xl border border-gray-100 bg-gray-50 p-4">
          <QRCodeSVG value={qrData} size={180} level="M" />
        </div>

        <p className="mt-4 text-xs text-gray-400">Show this QR code at bib pickup and check-in</p>

        <div className="mt-4 flex justify-center">
          <Badge variant={paymentVariant[registration.paymentStatus ?? 'PENDING'] ?? 'warning'}>
            {registration.paymentStatus === 'PAID' ? '✓ Payment confirmed' : '⏳ Payment pending'}
          </Badge>
        </div>
      </div>
    </div>
  );
}

export default function MyRegistrationsPage() {
  const [qrRegistration, setQrRegistration] = useState<Registration | null>(null);

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
      {qrRegistration && <QRModal registration={qrRegistration} onClose={() => setQrRegistration(null)} />}

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
        <div className="space-y-4">
          {registrations.map((r) => (
            <Card key={r.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  {/* Bib number strip */}
                  <div className="flex w-20 shrink-0 flex-col items-center justify-center bg-blue-600 py-5 text-white">
                    <p className="text-xs font-semibold uppercase opacity-70">Bib</p>
                    <p className="text-2xl font-black leading-tight">{r.bibNumber ?? '—'}</p>
                  </div>

                  {/* Main content */}
                  <div className="flex flex-1 items-center justify-between gap-4 px-5 py-4">
                    <div>
                      {(r.race as any)?.event?.name && (
                        <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-0.5">
                          {(r.race as any).event.name}
                        </p>
                      )}
                      <p className="font-semibold text-gray-900">{r.race?.name ?? 'Race'}</p>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {r.race?.distance ? `${r.race.distance} km` : ''}
                        {r.race?.startTime ? ` · ${formatDateTime(r.race.startTime)}` : ''}
                      </p>
                      {/* Payment status */}
                      <div className="mt-2 flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5 text-gray-400" />
                        <Badge variant={paymentVariant[r.paymentStatus ?? 'PENDING'] ?? 'warning'} >
                          {r.paymentStatus ?? 'PENDING'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {/* Race status */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400">{statusIcon[r.status]}</span>
                        <Badge variant={statusVariant[r.status] ?? 'default'}>{r.status.replace('_', ' ')}</Badge>
                      </div>
                      {/* QR button */}
                      <button
                        onClick={() => setQrRegistration(r)}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        Show QR
                      </button>
                    </div>
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
