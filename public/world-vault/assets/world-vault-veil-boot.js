/* ═══════════════════════════════════════════════════════════════
   WORLD VAULT · VEIL PAGE BOOT
   Runs before the core engine on each veil page.
   - Processes ?lift=granted from Stripe redirect
   - Sets body[data-access] based on held state
   - Swaps the save button for a lift button if glimpsed
═══════════════════════════════════════════════════════════════ */

(function () {
  if (!window.WorldVaultAccess) return;

  // 1. Process Stripe redirect — if the URL has ?lift=granted,
  //    add the veil to held and strip the param.
  window.WorldVaultAccess.processGrantParam();

  // 2. Set body[data-access] correctly based on held state.
  //    The core engine reads this once on boot to decide held vs glimpsed.
  window.WorldVaultAccess.applyAccessState();

  // 3. If glimpsed, swap the save button for a lift button.
  //    Done here (before engine boot) so the engine sees the right markup.
  const veil = document.body.dataset.veil;
  const access = document.body.dataset.access;

  if (access === 'glimpsed' && veil && veil !== 'becoming') {
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
      const lift = document.createElement('a');
      lift.className = 'lift-btn';
      lift.href = `/world-vault/lift?veil=${veil}`;
      lift.textContent = 'Lift this veil';
      saveBtn.replaceWith(lift);
    }
  }
})();
