import { useEffect, useRef } from 'react';
import type { AppData } from '../db/useData';
import { useAuthSession } from '../lib/auth';
import { pushSnapshot } from '../db/sharing';

/** Pousse le snapshot partagé vers Supabase (debounced) quand les données locales pertinentes changent. */
export function SyncProvider({ data }: { data: AppData }) {
  const session = useAuthSession();
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!session || data.shareLevel === 'none') return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      pushSnapshot(data, session.user.id, data.shareLevel);
    }, 2000);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, data.shareLevel, data.maxes, data.goals, data.sessions, data.sets]);

  return null;
}
