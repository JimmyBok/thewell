# The Well

A Next.js app for uploading **text and audio files** into **folders**. Files live in
Supabase Storage, folder structure and metadata live in Supabase Postgres.

- Nested folders with breadcrumb navigation
- Drag-and-drop or click-to-choose upload, several files at once
- Inline audio player and inline text preview — no download round-trip to look at something
- Rename and delete for both folders and files (deleting a folder cleans up its objects in storage)
- Search across file names

## Setup

### 1. Install

```bash
npm install
```

### 2. Create the Supabase project

Create a project at [supabase.com](https://supabase.com), then open **SQL Editor → New query**,
paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it. That creates:

- `public.folders` — `id`, `name`, `parent_id`, `created_at`
- `public.files` — `id`, `folder_id`, `name`, `storage_path`, `mime_type`, `size_bytes`, `kind`, `created_at`
- a trigger that stops a folder being moved inside itself
- the private `uploads` storage bucket, capped at 50 MB per object

### 3. Environment

```bash
cp .env.example .env.local
```

Fill it in from **Project Settings → API**:

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` secret — server only, never ship it to the browser |
| `SUPABASE_BUCKET` | `uploads` unless you renamed it |

### 4. Run

```bash
npm run dev     # http://localhost:3000
```

Until the environment variables are set, every page shows a short setup checklist instead
of crashing.

## How it fits together

```
app/
  page.tsx                     root folder
  f/[folderId]/page.tsx        one folder
  search/page.tsx              file-name search
  api/files/[id]/content       307 → short-lived signed URL (audio streaming, downloads)
  api/files/[id]/text          JSON body for the text preview
components/                    Browser, Uploader, FolderCard, FileCard, Breadcrumbs…
lib/
  supabase.ts                  service-role client, `server-only`
  data.ts                      reads: listing, breadcrumbs, search, signed URLs
  actions.ts                   writes: create/rename/delete folder, upload, rename/delete file
  files.ts                     text-vs-audio classification, name sanitising, formatting
supabase/schema.sql            run once
```

Uploads go through a **server action**, so the service-role key never reaches the browser and
the file type is validated server-side rather than trusting the `accept` attribute. The bucket
is private; playback and downloads go through a signed URL that expires after an hour.

`next.config.mjs` raises the server action body limit to 50 MB to match the bucket. If you want
larger files, raise both, or switch uploads to a Supabase [signed upload URL](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl)
so the bytes go straight from browser to storage.

## Accepted file types

- **Text** — `.txt` `.md` `.markdown` `.csv` `.tsv` `.json` `.log` `.srt` `.vtt` `.yaml` `.yml`, or any `text/*` MIME type
- **Audio** — `.mp3` `.wav` `.m4a` `.aac` `.ogg` `.opus` `.flac` `.webm` `.aiff`, or any `audio/*` MIME type

Anything else is rejected with a message naming the file. Adjust the sets in `lib/files.ts`.

## Adding accounts later

Right now there is one shared workspace: RLS is enabled with no permissive policies, and all
access goes through the service-role client on the server. To make it per-user:

1. Add `owner_id uuid references auth.users(id)` to both tables.
2. Add RLS policies scoped to `auth.uid()`, plus storage policies on the `uploads` bucket.
3. Swap `supabaseAdmin()` in `lib/data.ts` and `lib/actions.ts` for a request-scoped client
   built with `@supabase/ssr` (already a dependency) so queries run as the signed-in user.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run start      # serve the build
npm run typecheck  # tsc --noEmit
```
