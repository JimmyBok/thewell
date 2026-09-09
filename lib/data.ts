import 'server-only';

import { BUCKET, supabaseAdmin } from '@/lib/supabase';
import type { FileRow, FolderRow } from '@/lib/database.types';

export interface FolderContents {
  folders: FolderRow[];
  files: FileRow[];
}

/** Direct children of a folder. `null` means the root. */
export async function listChildren(folderId: string | null): Promise<FolderContents> {
  const db = supabaseAdmin();

  const folderQuery = db.from('folders').select('*').order('name', { ascending: true });
  const fileQuery = db.from('files').select('*').order('created_at', { ascending: false });

  const [folders, files] = await Promise.all([
    folderId === null ? folderQuery.is('parent_id', null) : folderQuery.eq('parent_id', folderId),
    folderId === null ? fileQuery.is('folder_id', null) : fileQuery.eq('folder_id', folderId),
  ]);

  if (folders.error) throw new Error(folders.error.message);
  if (files.error) throw new Error(files.error.message);

  return { folders: folders.data ?? [], files: files.data ?? [] };
}

export async function getFolder(folderId: string): Promise<FolderRow | null> {
  const { data, error } = await supabaseAdmin()
    .from('folders')
    .select('*')
    .eq('id', folderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/** Root-first chain of ancestors, ending with the folder itself. */
export async function getBreadcrumb(folderId: string): Promise<FolderRow[]> {
  const db = supabaseAdmin();
  const trail: FolderRow[] = [];
  let cursor: string | null = folderId;

  while (cursor && trail.length < 64) {
    // Annotated explicitly: `cursor` feeds the query that produces `data`, and
    // inference would otherwise chase its own tail.
    const { data, error }: { data: FolderRow | null; error: { message: string } | null } =
      await db.from('folders').select('*').eq('id', cursor).maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) break;

    trail.unshift(data);
    cursor = data.parent_id;
  }

  return trail;
}

export interface SearchHit extends FileRow {
  folderName: string | null;
}

export async function searchFiles(term: string): Promise<SearchHit[]> {
  const trimmed = term.trim();
  if (!trimmed) return [];

  const db = supabaseAdmin();
  const { data, error } = await db
    .from('files')
    .select('*')
    .ilike('name', `%${trimmed}%`)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const folderIds = [...new Set(rows.map((r) => r.folder_id).filter(Boolean))] as string[];

  const names = new Map<string, string>();
  if (folderIds.length) {
    const { data: folders, error: folderError } = await db
      .from('folders')
      .select('id, name')
      .in('id', folderIds);

    if (folderError) throw new Error(folderError.message);
    for (const folder of folders ?? []) names.set(folder.id, folder.name);
  }

  return rows.map((row) => ({
    ...row,
    folderName: row.folder_id ? (names.get(row.folder_id) ?? null) : null,
  }));
}

/** Short-lived URL for streaming or downloading a private object. */
export async function signedUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
  const { data, error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data) throw new Error(error?.message ?? 'Could not create a signed URL');
  return data.signedUrl;
}

/** Fetch a text file's contents for the preview pane. */
export async function readTextFile(
  storagePath: string,
  maxBytes = 200_000,
): Promise<{ text: string; truncated: boolean }> {
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).download(storagePath);
  if (error || !data) throw new Error(error?.message ?? 'Could not read the file');

  const buffer = Buffer.from(await data.arrayBuffer());
  const truncated = buffer.byteLength > maxBytes;
  const text = buffer.subarray(0, maxBytes).toString('utf8');

  return { text, truncated };
}
