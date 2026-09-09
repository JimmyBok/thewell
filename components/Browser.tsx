import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { FileCard } from '@/components/FileCard';
import { FolderCard } from '@/components/FolderCard';
import { NewFolderForm } from '@/components/NewFolderForm';
import { SetupNotice } from '@/components/SetupNotice';
import { Uploader } from '@/components/Uploader';
import { getBreadcrumb, listChildren } from '@/lib/data';

export async function Browser({ folderId }: { folderId: string | null }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return <SetupNotice />;
  }

  const trail = folderId ? await getBreadcrumb(folderId) : [];
  if (folderId && trail.length === 0) notFound();

  const { folders, files } = await listChildren(folderId);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Breadcrumbs trail={trail} />
        <h1 className="text-2xl font-semibold tracking-tight">
          {trail.at(-1)?.name ?? 'All files'}
        </h1>
      </div>

      <Uploader folderId={folderId} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide muted">Folders</h2>
          <div className="w-full sm:w-80">
            <NewFolderForm parentId={folderId} />
          </div>
        </div>

        {folders.length ? (
          <ul className="space-y-2">
            {folders.map((folder) => (
              <FolderCard key={folder.id} folder={folder} />
            ))}
          </ul>
        ) : (
          <p className="text-sm muted">No folders here yet.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide muted">
          Files{files.length ? ` (${files.length})` : ''}
        </h2>

        {files.length ? (
          <ul className="space-y-2">
            {files.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </ul>
        ) : (
          <p className="text-sm muted">Nothing uploaded here yet.</p>
        )}
      </section>
    </div>
  );
}
