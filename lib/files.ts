import type { FileKind } from '@/lib/database.types';

export const MAX_FILE_BYTES = 50 * 1024 * 1024; // keep in sync with the bucket limit

const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'csv',
  'tsv',
  'json',
  'log',
  'srt',
  'vtt',
  'yaml',
  'yml',
]);

const AUDIO_EXTENSIONS = new Set([
  'mp3',
  'wav',
  'm4a',
  'mp4a',
  'aac',
  'ogg',
  'oga',
  'opus',
  'flac',
  'webm',
  'aiff',
  'aif',
]);

/** The `accept` attribute for the file input. */
export const ACCEPT_ATTRIBUTE = [
  'text/*',
  'audio/*',
  'application/json',
  ...[...TEXT_EXTENSIONS, ...AUDIO_EXTENSIONS].map((ext) => `.${ext}`),
].join(',');

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0 || dot === fileName.length - 1) return '';
  return fileName.slice(dot + 1).toLowerCase();
}

/**
 * Split a name into its readable stem and extension so the two can be styled
 * apart in a heading. Keeps the original casing, unlike `extensionOf`, and
 * returns an empty extension for dotfiles and names that have none.
 */
export function splitFileName(fileName: string): { stem: string; ext: string } {
  const ext = extensionOf(fileName);
  if (!ext) return { stem: fileName, ext: '' };
  const dot = fileName.length - ext.length - 1;
  return { stem: fileName.slice(0, dot), ext: fileName.slice(dot + 1) };
}

/**
 * Decide whether an upload is text or audio. The browser's reported MIME type
 * wins; the extension is the fallback, because some browsers send an empty or
 * generic type for .md, .m4a and friends.
 */
export function classify(fileName: string, mimeType: string): FileKind | null {
  const type = (mimeType || '').toLowerCase();

  if (type.startsWith('audio/')) return 'audio';
  if (type.startsWith('text/')) return 'text';
  if (type === 'application/json' || type === 'application/x-ndjson') return 'text';

  const ext = extensionOf(fileName);
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio';
  if (TEXT_EXTENSIONS.has(ext)) return 'text';

  return null;
}

/**
 * Strip anything that would be awkward in a storage key or a URL, without
 * losing the readable part of the name.
 */
export function sanitizeFileName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? fileName;
  const cleaned = base
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 180) || 'untitled';
}

export const MAX_UPLOADER_NAME = 80; // keep in sync with files_uploaded_by_length

/**
 * Tidy the optional "uploaded by" name. Unlike `sanitizeFileName` this keeps
 * accents and punctuation, since it is a person's name rather than a storage
 * key — it only strips invisible characters, collapses runs of whitespace and
 * caps the length. Returns null when nothing usable is left.
 */
export function sanitizeUploaderName(value: string): string | null {
  const cleaned = value
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned ? cleaned.slice(0, MAX_UPLOADER_NAME).trim() : null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
