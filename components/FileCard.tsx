'use client';

import { useActionState, useEffect, useState } from 'react';

import { deleteFile, renameFile, type ActionResult } from '@/lib/actions';
import { formatBytes, formatDate, splitFileName } from '@/lib/files';
import type { FileRow } from '@/lib/database.types';

function TextPreview({ fileId }: { fileId: string }) {
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; text: string; truncated: boolean }
  >({ status: 'loading' });

  useEffect(() => {
    let active = true;

    fetch(`/api/files/${fileId}/text`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? 'Could not load this file.');
        return body as { text: string; truncated: boolean };
      })
      .then((body) => {
        if (active) setState({ status: 'ready', ...body });
      })
      .catch((error: Error) => {
        if (active) setState({ status: 'error', message: error.message });
      });

    return () => {
      active = false;
    };
  }, [fileId]);

  if (state.status === 'loading') return <p className="text-xs muted">Loading…</p>;
  if (state.status === 'error')
    return (
      <p className="text-xs" style={{ color: 'var(--accent)' }}>
        {state.message}
      </p>
    );

  return (
    <div>
      <pre
        className="max-h-80 overflow-auto rounded-lg p-3 text-xs leading-relaxed"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', whiteSpace: 'pre-wrap' }}
      >
        {state.text}
      </pre>
      {state.truncated ? <p className="mt-1 text-xs muted">Preview truncated — download for the rest.</p> : null}
    </div>
  );
}

export function FileCard({ file, location }: { file: FileRow; location?: string | null }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [renameState, renameAction] = useActionState<ActionResult | undefined, FormData>(
    renameFile,
    undefined,
  );
  const [deleteState, deleteAction, deleting] = useActionState<ActionResult | undefined, FormData>(
    deleteFile,
    undefined,
  );

  useEffect(() => {
    if (renameState?.ok) setEditing(false);
  }, [renameState]);

  const error = renameState?.error ?? deleteState?.error;
  const { stem, ext } = splitFileName(file.name);

  return (
    <li className="surface rounded-xl px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span aria-hidden className="text-lg">
          {file.kind === 'audio' ? '♪' : '¶'}
        </span>

        <div className="min-w-0 flex-1">
          {editing ? (
            <form action={renameAction} className="flex gap-2">
              <input type="hidden" name="id" value={file.id} />
              <input className="input" name="name" defaultValue={file.name} aria-label="File name" autoFocus />
              <button className="btn btn-primary shrink-0" type="submit">
                Save
              </button>
              <button className="btn shrink-0" type="button" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </form>
          ) : (
            <>
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs muted">
                {formatBytes(file.size_bytes)} · {formatDate(file.created_at)}
                {file.uploaded_by ? ` · by ${file.uploaded_by}` : ''}
                {location ? ` · in ${location}` : ''}
              </p>
            </>
          )}
        </div>

        {!editing ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <button className="btn" type="button" onClick={() => setOpen((value) => !value)}>
              {open ? 'Close' : file.kind === 'audio' ? 'Play' : 'Read'}
            </button>
            <a className="btn" href={`/api/files/${file.id}/content?download=1`}>
              Download
            </a>
            <button className="btn" type="button" onClick={() => setEditing(true)}>
              Rename
            </button>
            {confirming ? (
              <form action={deleteAction} className="flex gap-1.5">
                <input type="hidden" name="id" value={file.id} />
                <button className="btn" type="submit" disabled={deleting} style={{ color: 'var(--accent)' }}>
                  {deleting ? 'Deleting…' : 'Confirm'}
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
        ) : null}
      </div>

      {open ? (
        <div className="file-stage mt-4">
          <div className="file-stage-head">
            <span aria-hidden className="file-stage-glyph">
              {file.kind === 'audio' ? '♪' : '¶'}
            </span>

            <div className="min-w-0">
              <p className="file-stage-eyebrow">
                {file.kind === 'audio' ? 'Now playing' : 'Now reading'}
              </p>
              <h3 className="file-stage-title">
                {stem}
                {ext ? <span className="file-stage-ext">.{ext}</span> : null}
              </h3>
              {file.uploaded_by ? (
                <p className="file-stage-byline">
                  Uploaded by <span className="file-stage-author">{file.uploaded_by}</span>
                </p>
              ) : null}
              <p className="mt-1.5 text-xs muted">
                {formatBytes(file.size_bytes)} · {formatDate(file.created_at)}
                {location ? ` · in ${location}` : ''}
              </p>
            </div>
          </div>

          <div className="file-stage-body">
            {file.kind === 'audio' ? (
              <audio className="w-full" controls preload="metadata" src={`/api/files/${file.id}/content`} />
            ) : (
              <TextPreview fileId={file.id} />
            )}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs" style={{ color: 'var(--accent)' }}>
          {error}
        </p>
      ) : null}
    </li>
  );
}
