import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="surface rounded-xl p-6">
      <h1 className="text-xl font-semibold tracking-tight">Nothing here</h1>
      <p className="mt-2 text-sm muted">That folder or file no longer exists.</p>
      <Link className="btn mt-4" href="/">
        Back to all files
      </Link>
    </div>
  );
}
