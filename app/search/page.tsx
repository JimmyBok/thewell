import Link from 'next/link';

import { FileCard } from '@/components/FileCard';
import { SetupNotice } from '@/components/SetupNotice';
import { searchFiles } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return <SetupNotice />;
  }

  const { q = '' } = await searchParams;
  const hits = await searchFiles(q);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm muted hover:underline">
          ← All files
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {hits.length} result{hits.length === 1 ? '' : 's'} for “{q}”
        </h1>
      </div>

      {hits.length ? (
        <ul className="space-y-2">
          {hits.map((hit) => (
            <FileCard key={hit.id} file={hit} location={hit.folderName ?? 'All files'} />
          ))}
        </ul>
      ) : (
        <p className="text-sm muted">No file names match that.</p>
      )}
    </div>
  );
}
