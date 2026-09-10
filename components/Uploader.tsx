'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';

import { uploadFiles, type ActionResult } from '@/lib/actions';
import { ACCEPT_ATTRIBUTE, MAX_UPLOADER_NAME, formatBytes } from '@/lib/files';

/** Remembered so the same person doesn't retype their name on every upload. */
const NAME_STORAGE_KEY = 'thewell:uploader-name';

export function Uploader({ folderId }: { folderId: string | null }) {
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    uploadFiles,
    undefined,
  );

  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameFieldId = useId();
  const [queued, setQueued] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploaderName, setUploaderName] = useState('');

  // Read after mount, not during render, so the server and client markup match.
  useEffect(() => {
    try {
      setUploaderName(window.localStorage.getItem(NAME_STORAGE_KEY) ?? '');
    } catch {
      // Private browsing and blocked storage: the field just starts empty.
    }
  }, []);

  function rememberName(value: string) {
    setUploaderName(value);
    try {
      if (value.trim()) window.localStorage.setItem(NAME_STORAGE_KEY, value);
      else window.localStorage.removeItem(NAME_STORAGE_KEY);
    } catch {
      // Not being able to remember it is not worth failing the upload over.
    }
  }

  useEffect(() => {
    if (state?.ok) {
      setQueued([]);
      // Clears the file input; the name field is controlled, so it survives
      // and stays filled in for the next upload.
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

        <div className="mx-auto mt-5 max-w-xs text-left">
          <label htmlFor={nameFieldId} className="block text-xs font-medium">
            Your name <span className="muted">— optional</span>
          </label>
          <input
            id={nameFieldId}
            className="input mt-1.5"
            name="uploadedBy"
            type="text"
            autoComplete="name"
            maxLength={MAX_UPLOADER_NAME}
            placeholder="Who is uploading these?"
            value={uploaderName}
            onChange={(event) => rememberName(event.target.value)}
            disabled={pending}
          />
        </div>

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
