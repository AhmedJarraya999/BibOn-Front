import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
        <FileQuestion className="h-8 w-8 text-blue-500" />
      </div>
      <div>
        <h1 className="text-4xl font-bold text-gray-900">404</h1>
        <p className="mt-2 text-lg font-medium text-gray-700">Page not found</p>
        <p className="mt-1 text-sm text-gray-500">The page you're looking for doesn't exist.</p>
      </div>
      <Link
        href="/events"
        className="mt-2 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
