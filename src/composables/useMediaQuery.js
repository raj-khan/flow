import { onBeforeUnmount, ref } from 'vue'

/** The width below which the layout is a phone's: tools at the bottom, panels as sheets. */
export const PHONE = '(max-width: 767px)'

/**
 * Whether a media query matches, kept up to date as the window changes.
 * @param {string} query
 */
export function useMediaQuery(query) {
  const list = window.matchMedia?.(query)
  const matches = ref(Boolean(list?.matches))
  const update = (/** @type {MediaQueryListEvent} */ event) => (matches.value = event.matches)
  list?.addEventListener('change', update)
  onBeforeUnmount(() => list?.removeEventListener('change', update))
  return matches
}
