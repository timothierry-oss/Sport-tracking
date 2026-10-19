import { useEffect, useState } from 'react';

// Routage par hash : fonctionne tel quel sur GitHub Pages.

const current = () => location.hash.replace(/^#/, '') || '/';

export function useRoute() {
  const [path, setPath] = useState(current);
  useEffect(() => {
    const on = () => {
      setPath(current());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}

export function navigate(path: string) {
  location.hash = path;
}

export function goBack(fallback = '/') {
  if (history.length > 1) history.back();
  else navigate(fallback);
}
