'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function SearchBoxInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [term, setTerm] = useState(params.get('q') ?? '');

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = term.trim();
        router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/');
      }}
      role="search"
    >
      <input
        className="input"
        type="search"
        name="q"
        value={term}
        placeholder="Search files…"
        aria-label="Search files"
        onChange={(event) => setTerm(event.target.value)}
      />
    </form>
  );
}

export function SearchBox() {
  return (
    <Suspense fallback={<div className="input opacity-50">Search files…</div>}>
      <SearchBoxInner />
    </Suspense>
  );
}
