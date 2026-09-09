export function SetupNotice() {
  return (
    <div className="surface rounded-xl p-6">
      <h1 className="text-xl font-semibold tracking-tight">Connect Supabase to get started</h1>
      <ol className="mt-4 space-y-2 text-sm leading-relaxed muted">
        <li>
          1. Create a project at <span className="font-mono">supabase.com</span>.
        </li>
        <li>
          2. Open the SQL editor and run <span className="font-mono">supabase/schema.sql</span> from
          this repo — it creates the tables and the <span className="font-mono">uploads</span>{' '}
          bucket.
        </li>
        <li>
          3. Copy <span className="font-mono">.env.example</span> to{' '}
          <span className="font-mono">.env.local</span> and paste in your project URL, anon key and
          service role key.
        </li>
        <li>
          4. Restart <span className="font-mono">npm run dev</span>.
        </li>
      </ol>
    </div>
  );
}
