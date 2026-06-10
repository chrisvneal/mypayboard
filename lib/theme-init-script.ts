/**
 * Runs before first paint (injected from root layout) so the saved theme class
 * is on <html> before CSS paints — avoids a light→dark flash on reload.
 *
 * Mirrors readUserTheme() + legacy mypayboard-theme fallback without importing
 * client modules into the server layout.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=null;var u=localStorage.getItem('mypayboard-user');if(u){var id=JSON.parse(u).id;if(id){var p=localStorage.getItem('mypayboard-prefs-'+id);if(p){var j=JSON.parse(p);if(j.theme==='dark'||j.theme==='light')t=j.theme}}}if(!t){var l=localStorage.getItem('mypayboard-theme');if(l==='dark'||l==='light')t=l}if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})();`
