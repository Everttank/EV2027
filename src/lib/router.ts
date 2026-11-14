// Minimale hash-router: '#/gezondheid/eten' → ['gezondheid', 'eten'].
// Hash-routing werkt op elke statische host (GitHub Pages) zonder extra instellingen.

import { useEffect, useState } from 'react';

function parse(): string[] {
  return window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
}

export function useRoute(): string[] {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => {
      setRoute(parse());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function go(path: string) {
  window.location.hash = path.startsWith('/') ? path : `/${path}`;
}
