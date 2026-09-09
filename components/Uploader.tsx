'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

import { uploadFiles, type ActionResult } from '@/lib/actions';
import { ACCEPT_ATTRIBUTE, formatBytes } from '@/lib/files';

export function Uploader({ folderId }: { folderId: string | null }) {
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    uploadFiles,
    undefined,
  );

  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [queued, setQueued] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      setQueued([]);
      formRef.current?.reset();
    }
  }, [state]);

  function adopt(list: FileList | null) {
    if (!list?.length) return;
    const dt = new DataTransfer();
    for (const file of Array.from(list)) dt.items.add(file);
    if (inputRef.current) inputRef.current.files = dt.files;
    setQueued(Array.from(dt.files));
  }

  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name="folderId" value={folderId ?? 'root'} />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          adopt(event.dataTransfer.files);
        }}
        className="rounded-xl px-5 py-8 text-center transition"
        style={{
          border: `1.5px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          background: dragging ? 'var(--accent-soft)' : 'var(--surface)',
        }}
      >
        <p className="text-sm font-medium">Drop text or audio files here</p>
        <p className="mt-1 text-xs muted">.txt .md .csv .json — .mp3 .wav .m4a .ogg .flac</p>

        <input
          ref={inputRef}
          type="file"
          name="files"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          onChange={(event) => setQueued(Array.from(event.target.files ?? []))}
        />

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
          >
            Choose files
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending || !queued.length}>
            {pending
              ? 'Uploading…'
              : `Upload${queued.length ? ` ${queued.length} file${queued.length === 1 ? '' : 's'}` : ''}`}
          </button>
        </div>

        {queued.length ? (
          <ul className="mx-auto mt-4 max-w-md space-y-1 text-left text-xs muted">
            {queued.map((file) => (
              <li key={`${file.name}-${file.lastModified}`} className="flex justify-between gap-4">
                <span className="truncate">{file.name}</span>
                <span className="shrink-0">{formatBytes(file.size)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {state?.error ? (
        <p className="mt-2 text-sm" style={{ color: 'var(--accent)' }}>
          {state.error}
        </p>
      ) : null}
      {state?.ok && state.message ? <p className="mt-2 text-sm muted">{state.message}</p> : null}
    </form>
  );
}
