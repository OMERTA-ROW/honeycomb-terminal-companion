import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
export function useAccountUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const refresh = () => { void supabase.auth.getUser().then(({ data }) => { if (alive) { setUser(data.user); setReady(true); } }); };
    refresh(); window.addEventListener('honeycomb-auth-change', refresh);
    return () => { alive = false; window.removeEventListener('honeycomb-auth-change', refresh); };
  }, []);
  return { user, ready };
}