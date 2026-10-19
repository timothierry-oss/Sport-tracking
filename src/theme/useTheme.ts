import { useCallback, useEffect, useState } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';

function readPref(): ThemePref {
  try {
    return (localStorage.getItem('theme') as ThemePref) || 'system';
  } catch {
    return 'system';
  }
}

function apply(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#f4f2ee');
}

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(readPref);
  useEffect(() => {
    apply(pref);
    if (pref !== 'system') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = () => apply('system');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [pref]);
  const set = useCallback((p: ThemePref) => {
    try {
      localStorage.setItem('theme', p);
    } catch {
      /* stockage indisponible : le choix ne vaut que pour cette visite */
    }
    setPref(p);
  }, []);
  return [pref, set] as const;
}
