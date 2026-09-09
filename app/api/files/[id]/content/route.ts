import { NextResponse } from 'next/server';

import { signedUrl } from '@/lib/data';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Redirect to a short-lived signed URL for the stored object. Supabase serves
 * it with range support, so <audio> can seek without us proxying the bytes.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin()
    .from('files')
    .select('storage_path, name')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'File not found' }, { status: 404 });

  const wantsDownload = new URL(request.url).searchParams.has('download');
  let url = await signedUrl(data.storage_path, 60 * 60);

  if (wantsDownload) {
    url += `&download=${encodeURIComponent(data.name)}`;
  }

  return NextResponse.redirect(url, 307);
}
