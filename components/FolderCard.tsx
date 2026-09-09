'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';

import { deleteFolder, renameFolder, type ActionResult } from '@/lib/actions';
import type { FolderRow } from '@/lib/database.types';

export function FolderCard({ folder }: { folder: FolderRow }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [renameState, renameAction] = useActionState<ActionResult | undefined, FormData>(
    renameFolder,
    undefined,
  );
  const [deleteState, deleteAction, deleting] = useActionState<ActionResult | undefined, FormData>(
    deleteFolder,
    undefined,
  );

  useEffect(() => {
    if (renameState?.ok) setEditing(false);
  }, [renameState]);

  const error = renameState?.error ?? deleteState?.error;

  return (
    <li className="surface rounded-xl px-4 py-3">
      {editing ? (
        <form action={renameAction} className="flex gap-2">
          <input type="hidden" name="id" value={folder.id} />
          <input className="input" name="name" defaultValue={folder.name} aria-label="Folder name" autoFocus />
          <button className="btn btn-primary shrink-0" type="submit">
            Save
          </button>
          <button className="btn shrink-0" type="button" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-3">
          <span aria-hidden className="text-lg">
            ▸
          </span>
          <Link href={`/f/${folder.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
            {folder.name}
          </Link>

          <div className="flex shrink-0 items-center gap-1.5">
            <button className="btn" type="button" onClick={() => setEditing(true)}>
              Rename
            </button>
            {confirming ? (
              <form action={deleteAction} className="flex gap-1.5">
                <input type="hidden" name="id" value={folder.id} />
                <button className="btn" type="submit" disabled={deleting} style={{ color: 'var(--accent)' }}>
                  {deleting ? 'Deleting…' : 'Delete everything inside'}
                </button>
                <button className="btn" type="button" onClick={() => setConfirming(false)}>
                  Keep
                </button>
              </form>
            ) : (
              <button className="btn" type="button" onClick={() => setConfirming(true)}>
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {error ? (
        <p className="mt-2 text-xs" style={{ color: 'var(--accent)' }}>
          {error}
        </p>
      ) : null}
    </li>
  );
}
