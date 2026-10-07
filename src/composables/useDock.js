import { computed } from 'vue'

import { PHONE, useMediaQuery } from '@/composables/useMediaQuery.js'
import { useCanvasStore } from '@/stores/canvas.js'

/** Pixels the side panel takes from the left, open and folded to its rail. */
export const DOCK_WIDTH = Object.freeze({ open: 232, rail: 52 })

/**
 * The side panel, on screens wide enough for one: a phone keeps the menu and
 * the bottom tool bar. `docked` is whether the panel is open, so what it holds,
 * such as the selection's colours, shows inside it rather than over the canvas.
 */
export function useDock() {
  const canvas = useCanvasStore()
  const isPhone = useMediaQuery(PHONE)
  const shown = computed(() => !isPhone.value)
  const docked = computed(() => shown.value && canvas.dockOpen)
  const width = computed(() =>
    !shown.value ? 0 : canvas.dockOpen ? DOCK_WIDTH.open : DOCK_WIDTH.rail,
  )
  return { shown, docked, width }
}
