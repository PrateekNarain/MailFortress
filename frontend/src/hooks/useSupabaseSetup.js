import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useSupabaseSetup = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (typeof window === 'undefined') return;

      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          if (mounted) setIsReady(true);
          return;
        }

        // Dev fallback: allow UI work without an authenticated session
        if (import.meta.env.DEV) {
          console.warn('Dev fallback: no supabase session; marking ready for UI development.');
          if (mounted) setIsReady(true);
          return;
        }
      } catch (err) {
        console.error('Supabase init error:', err);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && mounted) setIsReady(true);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  return isReady;
};
