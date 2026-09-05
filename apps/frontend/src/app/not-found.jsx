import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 p-8 text-center shadow-xs">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">404</h1>
        <h2 className="text-base font-bold text-gray-800 mb-2">Page Not Found</h2>
        <p className="text-xs text-gray-500 mb-6">
          The page or quotation you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-semibold transition"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
