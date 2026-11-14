/* ═══════════════════════════════════════════════════════════════
   WORLD VAULT · THRESHOLD ACCESS WIRE
   Reads the held array on threshold load and adjusts each veil's
   visual state. When a veil is held, the .held class is removed
   so the veil renders bright; when not held, the class stays so
   the dimmer state and "Held for when you're ready" note show.
═══════════════════════════════════════════════════════════════ */

(function () {
  if (!window.WorldVaultAccess) return;

  const veils = document.querySelectorAll('.veil[data-veil]');
  veils.forEach(veil => {
    const name = veil.dataset.veil;
    const held = window.WorldVaultAccess.isVeilHeld(name);
    if (held) {
      veil.classList.remove('held');
      veil.dataset.access = 'public';
    } else {
      veil.classList.add('held');
      veil.dataset.access = 'held';
    }
  });
})();
