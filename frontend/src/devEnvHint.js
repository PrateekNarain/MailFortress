// Development-only helper: show helpful console hints about missing env vars.
// This is an external module so we can avoid using 'unsafe-inline' in the CSP.
if (import.meta.env && import.meta.env.DEV) {
  try {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      // Developer-friendly console hint when env vars are missing
      console.warn('Supabase env vars not found. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env.local');
    } else {
      console.info('Supabase env available (DEV).');
    }
  } catch (e) {
    // be defensive — do not throw in page runtime
  }
}

export default {};
