'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';

import { BUCKET, supabaseAdmin } from '@/lib/supabase';
import { MAX_FILE_BYTES, classify, sanitizeFileName, sanitizeUploaderName } from '@/lib/files';

export interface ActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

const OK: ActionResult = { ok: true };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

function asFolderId(value: FormDataEntryValue | null): string | null {
  const raw = typeof value === 'string' ? value.trim() : '';
  return raw === '' || raw === 'root' ? null : raw;
}

function refresh() {
  revalidatePath('/', 'layout');
}

/** Postgres unique-violation, surfaced through PostgREST. */
function isDuplicate(code: string | undefined): boolean {
  return code === '23505';
}

// Folders ---------------------------------------------------------------------

export async function createFolder(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get('name') ?? '').trim();
  const parentId = asFolderId(formData.get('parentId'));

  if (!name) return fail('Give the folder a name.');
  if (name.length > 120) return fail('That name is too long.');

  const { error } = await supabaseAdmin()
    .from('folders')
    .insert({ name, parent_id: parentId });

  if (error) {
    return fail(
      isDuplicate(error.code)
        ? `There is already a folder called “${name}” here.`
        : error.message,
    );
  }

  refresh();
  return { ok: true, message: `Created “${name}”.` };
}

export async function renameFolder(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();

  if (!id) return fail('Missing folder.');
  if (!name) return fail('Give the folder a name.');

  const { error } = await supabaseAdmin().from('folders').update({ name }).eq('id', id);

  if (error) {
    return fail(
      isDuplicate(error.code)
        ? `There is already a folder called “${name}” here.`
        : error.message,
    );
  }

  refresh();
  return OK;
}

/** Every folder id in the subtree, including the folder itself. */
async function collectSubtree(folderId: string): Promise<string[]> {
  const db = supabaseAdmin();
  const all = [folderId];
  let frontier = [folderId];

  while (frontier.length && all.length < 5000) {
    const { data, error } = await db.from('folders').select('id').in('parent_id', frontier);
    if (error) throw new Error(error.message);

    frontier = (data ?? []).map((row) => row.id);
    all.push(...frontier);
  }

  return all;
}

export async function deleteFolder(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get('id') ?? '');
  if (!id) return fail('Missing folder.');

  const db = supabaseAdmin();

  try {
    const ids = await collectSubtree(id);

    // Remove the stored objects first — the database rows go away by cascade,
    // and orphaned objects in the bucket would be invisible but still billed.
    const { data: files, error: filesError } = await db
      .from('files')
      .select('storage_path')
      .in('folder_id', ids);

    if (filesError) throw new Error(filesError.message);

    const paths = (files ?? []).map((row) => row.storage_path);
    if (paths.length) {
      const { error: storageError } = await db.storage.from(BUCKET).remove(paths);
      if (storageError) throw new Error(storageError.message);
    }

    const { error } = await db.from('folders').delete().eq('id', id);
    if (error) throw new Error(error.message);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Could not delete that folder.');
  }

  refresh();
  return OK;
}

// Files -----------------------------------------------------------------------

export async function uploadFiles(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const folderId = asFolderId(formData.get('folderId'));
  const uploadedBy = sanitizeUploaderName(String(formData.get('uploadedBy') ?? ''));
  const uploads = formData.getAll('files').filter((entry): entry is File => entry instanceof File);

  const candidates = uploads.filter((file) => file.size > 0);
  if (!candidates.length) return fail('Choose at least one file.');

  const db = supabaseAdmin();
  const rejected: string[] = [];
  let stored = 0;

  for (const file of candidates) {
    const kind = classify(file.name, file.type);

    if (!kind) {
      rejected.push(`${file.name} (only text and audio files are accepted)`);
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      rejected.push(`${file.name} (over the 50 MB limit)`);
      continue;
    }

    const safeName = sanitizeFileName(file.name);
    const storagePath = `${folderId ?? 'root'}/${randomUUID()}-${safeName}`;
    const contentType = file.type || (kind === 'audio' ? 'audio/mpeg' : 'text/plain');

    const { error: uploadError } = await db.storage
      .from(BUCKET)
      .upload(storagePath, file, { contentType, upsert: false });

    if (uploadError) {
      rejected.push(`${file.name} (${uploadError.message})`);
      continue;
    }

    const { error: rowError } = await db.from('files').insert({
      folder_id: folderId,
      name: safeName,
      storage_path: storagePath,
      mime_type: contentType,
      size_bytes: file.size,
      kind,
      uploaded_by: uploadedBy,
    });

    if (rowError) {
      // Don't leave the object behind if we couldn't record it.
      await db.storage.from(BUCKET).remove([storagePath]);
      rejected.push(`${file.name} (${rowError.message})`);
      continue;
    }

    stored += 1;
  }

  refresh();

  if (!stored) return fail(`Nothing was uploaded — ${rejected.join('; ')}`);

  return {
    ok: true,
    message:
      `Uploaded ${stored} file${stored === 1 ? '' : 's'}.` +
      (rejected.length ? ` Skipped: ${rejected.join('; ')}` : ''),
  };
}

export async function renameFile(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get('id') ?? '');
  const name = sanitizeFileName(String(formData.get('name') ?? '').trim());

  if (!id) return fail('Missing file.');
  if (!name) return fail('Give the file a name.');

  const { error } = await supabaseAdmin().from('files').update({ name }).eq('id', id);
  if (error) return fail(error.message);

  refresh();
  return OK;
}

export async function deleteFile(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get('id') ?? '');
  if (!id) return fail('Missing file.');

  const db = supabaseAdmin();

  const { data: row, error: lookupError } = await db
    .from('files')
    .select('storage_path')
    .eq('id', id)
    .maybeSingle();

  if (lookupError) return fail(lookupError.message);
  if (!row) return fail('That file is already gone.');

  const { error: storageError } = await db.storage.from(BUCKET).remove([row.storage_path]);
  if (storageError) return fail(storageError.message);

  const { error } = await db.from('files').delete().eq('id', id);
  if (error) return fail(error.message);

  refresh();
  return OK;
}
