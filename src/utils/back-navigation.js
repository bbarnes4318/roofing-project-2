/**
 * Framework-agnostic back navigation utilities.
 * Stores ephemeral UI context on the current history entry and mirrors to sessionStorage.
 */

/**
 * @typedef {Object} RestorableContext
 * @property {number=} scrollY
 * @property {string[]=} expandedRowIds
 * @property {string=} focusedItemId
 * @property {string=} anchorId
 */

let installed = false;

export function installBackNavigation() {
  if (installed) return;
  installed = true;
  try { if (typeof history !== 'undefined') history.scrollRestoration = 'manual'; } catch {}
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', () => {
      const ctx = readEntryCtx();
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          try { window.scrollTo({ top: (ctx && ctx.scrollY) != null ? ctx.scrollY : 0, left: 0, behavior: 'auto' }); } catch {}
          if (ctx && ctx.anchorId) {
            const el = document.getElementById(ctx.anchorId);
            if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
          }
        });
      }
    });
  }
}

/**
 * Capture ephemeral state to the current history entry and mirror to sessionStorage.
 * @param {() => RestorableContext} capture
 */
export function onEphemeralChange(capture) {
  const ctx = capture();
  try {
    const nextState = { ...(history.state || {}), __ctx: ctx };
    history.replaceState(nextState, document.title, location.href);
  } catch {}
  try { sessionStorage.setItem('ctx:' + entryKey(), JSON.stringify(ctx)); } catch {}
}

/**
 * Read ephemeral context associated with the current history entry.
 * @returns {RestorableContext|undefined}
 */
export function readEntryCtx() {
  try {
    const fromHistory = history.state && history.state.__ctx;
    if (fromHistory) return fromHistory;
  } catch {}
  try {
    const v = sessionStorage.getItem('ctx:' + entryKey());
    return v ? JSON.parse(v) : undefined;
  } catch { return undefined; }
}

/**
 * Navigate by pushing/replacing a new URL while first saving ephemeral state on the current entry.
 * @param {string} to
 * @param {() => RestorableContext} capture
 * @param {{ replace?: boolean }=} opts
 */
export function navigate(to, capture, opts) {
  onEphemeralChange(capture);
  try {
    if (opts && opts.replace) history.replaceState({}, document.title, to);
    else history.pushState({}, document.title, to);
  } catch {}
}

/**
 * Go back in history when possible, otherwise navigate to a sensible fallback URL.
 * @param {string} fallbackUrl
 */
export function goBackOr(fallbackUrl) {
  try {
    if (history.length > 1) history.back();
    else location.assign(fallbackUrl);
  } catch {
    try { location.assign(fallbackUrl); } catch {}
  }
}

function entryKey() {
  try { return location.pathname + location.search + location.hash; } catch { return ''; }
}

export const __internal = { entryKey };


