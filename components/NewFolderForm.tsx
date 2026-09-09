'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';

import { createFolder, type ActionResult } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary shrink-0" type="submit" disabled={pending}>
      {pending ? 'Creating…' : 'New folder'}
    </button>
  );
}

export function NewFolderForm({ parentId }: { parentId: string | null }) {
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    createFolder,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div>
      <form ref={formRef} action={action} className="flex gap-2">
        <input type="hidden" name="parentId" value={parentId ?? 'root'} />
        <input
          className="input"
          name="name"
          placeholder="Folder name"
          aria-label="New folder name"
          maxLength={120}
          required
        />
        <SubmitButton />
      </form>

      {state?.error ? (
        <p className="mt-2 text-sm" style={{ color: 'var(--accent)' }}>
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
