'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export default function PaymentSuccessPage() {
  const params = useSearchParams();
  const paymentId = params.get('payment_id');
  const registrationId = params.get('registrationId');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!paymentId || !registrationId) { setStatus('error'); return; }
    axios.post(`${BASE_URL}/payments/verify`, { paymentId, registrationId })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [paymentId, registrationId]);

  if (status === 'loading') return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-gray-500">
      <Loader2 className="h-10 w-10 animate-spin" />
      <p>Verifying your payment…</p>
    </div>
  );

  if (status === 'success') return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center p-4">
      <CheckCircle className="h-16 w-16 text-green-500" />
      <h1 className="text-2xl font-bold text-gray-900">Payment Confirmed!</h1>
      <p className="text-gray-500 max-w-sm">
        Your registration is confirmed. Check your email for your login credentials to access the participant portal.
      </p>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center p-4">
      <XCircle className="h-16 w-16 text-red-500" />
      <h1 className="text-2xl font-bold text-gray-900">Verification Failed</h1>
      <p className="text-gray-500 max-w-sm">
        We could not verify your payment. Please contact the event organizer with your registration ID.
      </p>
    </div>
  );
}
