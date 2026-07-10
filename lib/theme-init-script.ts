/**
 * Runs before first paint (injected from root layout) so the saved theme class
 * is on <html> before CSS paints — avoids a light→dark flash on reload.
 *
 * Prefs now live in Supabase (see userPrefs.ts), which this pre-hydration,
 * pre-network script obviously can't await — it reads a narrow, dedicated
 * theme-only cache (mypayboard-theme-cache-{clerkId}, written by
 * writeThemeCache in userPrefs.ts) that exists purely for this purpose, not
 * as a prefs source of truth. mypayboard-user (session.ts) is unrelated and
 * still the synchronous "who's signed in" cache.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=null;var u=localStorage.getItem('mypayboard-user');if(u){var id=JSON.parse(u).id;if(id){var c=localStorage.getItem('mypayboard-theme-cache-'+id);if(c==='dark'||c==='light')t=c}}if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})();`
