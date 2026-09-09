import { NextResponse } from 'next/server';

import { readTextFile } from '@/lib/data';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin()
    .from('files')
    .select('storage_path, kind')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'File not found' }, { status: 404 });
  if (data.kind !== 'text') {
    return NextResponse.json({ error: 'That file is not text' }, { status: 400 });
  }

  try {
    return NextResponse.json(await readTextFile(data.storage_path));
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Could not read the file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
