'use client';

import { useEffect, useState } from 'react';

export function useOrigin(): string {
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    const id = window.setTimeout(() => setOrigin(window.location.origin), 0);
    return () => window.clearTimeout(id);
  }, []);
  return origin;
}
