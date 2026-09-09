import Link from 'next/link';
import { Fragment } from 'react';

import type { FolderRow } from '@/lib/database.types';

export function Breadcrumbs({ trail }: { trail: FolderRow[] }) {
  const parents = trail.slice(0, -1);
  const current = trail.at(-1);

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm">
      <Link href="/" className="muted hover:underline">
        All files
      </Link>

      {parents.map((folder) => (
        <Fragment key={folder.id}>
          <span aria-hidden className="muted">
            /
          </span>
          <Link href={`/f/${folder.id}`} className="muted hover:underline">
            {folder.name}
          </Link>
        </Fragment>
      ))}

      {current ? (
        <>
          <span aria-hidden className="muted">
            /
          </span>
          <span className="font-medium" aria-current="page">
            {current.name}
          </span>
        </>
      ) : null}
    </nav>
  );
}
