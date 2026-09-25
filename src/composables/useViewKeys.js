import { onBeforeUnmount, onMounted } from 'vue'

import { isCanvasKey } from '@/composables/canvasKeys.js'

/**
 * F for full screen and Alt+Z for zen mode, bound once at the shell. Alt+Z is
 * read from the physical key: on a Mac, Option+Z types a character instead.
 * @param {{ fullScreen: () => void, zen: () => void }} actions
 */
export function useViewKeys({ fullScreen, zen }) {
  /** @param {KeyboardEvent} event */
  function onKeydown(event) {
    if (event.ctrlKey || event.metaKey || !isCanvasKey(event)) return
    if (event.altKey && event.code === 'KeyZ') {
      event.preventDefault()
      zen()
    } else if (!event.altKey && !event.shiftKey && event.key.toLowerCase() === 'f') {
      event.preventDefault()
      fullScreen()
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
