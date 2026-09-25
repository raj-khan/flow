/**
 * Whether a key belongs to the canvas's shortcuts, rather than to a field, a
 * menu or a dialog that is open.
 * @param {KeyboardEvent} event
 */
export function isCanvasKey(event) {
  const target = /** @type {HTMLElement | null} */ (event.target)
  if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return false
  if (target?.isContentEditable || target?.closest?.('[role="menu"]')) return false
  return !document.querySelector('[role="dialog"][aria-modal="true"]')
}
