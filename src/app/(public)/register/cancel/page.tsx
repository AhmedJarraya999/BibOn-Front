'use client';
import { XCircle } from 'lucide-react';
import Link from 'next/link';

export default function PaymentCancelPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center p-4">
      <XCircle className="h-16 w-16 text-amber-500" />
      <h1 className="text-2xl font-bold text-gray-900">Payment Cancelled</h1>
      <p className="text-gray-500 max-w-sm">
        Your payment was cancelled. Your pre-registration is still saved — you can pay online or on-site at the event.
      </p>
      <Link href="/" className="mt-2 text-blue-600 hover:underline text-sm">Back to home</Link>
    </div>
  );
}
