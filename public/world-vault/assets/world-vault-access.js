/* ═══════════════════════════════════════════════════════════════
   WORLD VAULT · ACCESS LAYER
   The single source of truth for veil access.

   API:
     isVeilHeld(name)   → boolean
     holdVeil(name)     → adds veil to held set
     releaseVeil(name)  → removes (for testing / future "unhold")
     heldVeils()        → array of held veil names
     processGrantParam() → reads ?lift=granted from URL, holds the
                           current page's veil if present, strips param

   For now this layer reads/writes localStorage. To upgrade to
   server auth later, replace the body of these four functions
   with a server call. No other code in the project will need
   to change.
═══════════════════════════════════════════════════════════════ */

(function (global) {
  const KEY = 'worldvault.held';
  // Becoming is always held, for everyone, forever.
  const ALWAYS_HELD = ['becoming'];

  function readHeld() {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeHeld(arr) {
    try {
      localStorage.setItem(KEY, JSON.stringify(arr));
    } catch {
      /* localStorage not available — silent fail */
    }
  }

  function heldVeils() {
    const stored = readHeld();
    const all = new Set([...ALWAYS_HELD, ...stored]);
    return Array.from(all);
  }

  function isVeilHeld(name) {
    if (ALWAYS_HELD.includes(name)) return true;
    return readHeld().includes(name);
  }

  function holdVeil(name) {
    if (ALWAYS_HELD.includes(name)) return;
    const current = readHeld();
    if (!current.includes(name)) {
      current.push(name);
      writeHeld(current);
    }
  }

  function releaseVeil(name) {
    const filtered = readHeld().filter(v => v !== name);
    writeHeld(filtered);
  }

  // Reads ?lift=granted from URL. If present, holds the page's
  // veil (read from body[data-veil]) and removes the query param
  // from the URL so it doesn't accidentally get shared.
  function processGrantParam() {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('lift') !== 'granted') return false;
    const veil = document.body?.dataset?.veil;
    if (veil && veil !== 'becoming') {
      holdVeil(veil);
    }
    // Strip the param so a refresh or share doesn't carry it
    params.delete('lift');
    const newQuery = params.toString();
    const newUrl = window.location.pathname + (newQuery ? '?' + newQuery : '') + window.location.hash;
    window.history.replaceState({}, '', newUrl);
    return true;
  }

  // Sets body[data-access] to 'held' or 'glimpsed' based on the
  // page's veil. Called by the core engine and by the threshold.
  function applyAccessState() {
    if (typeof document === 'undefined') return;
    const veil = document.body?.dataset?.veil;
    if (!veil) return;
    document.body.dataset.access = isVeilHeld(veil) ? 'held' : 'glimpsed';
  }

  global.WorldVaultAccess = {
    isVeilHeld,
    holdVeil,
    releaseVeil,
    heldVeils,
    processGrantParam,
    applyAccessState,
  };
})(window);
