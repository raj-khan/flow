import { onBeforeUnmount, onMounted, ref } from 'vue'

/** The browser's full screen, for the whole app, and whether it is on. */
export function useFullScreen() {
  const isFullScreen = ref(Boolean(document.fullscreenElement))
  const isAvailable = Boolean(document.fullscreenEnabled)

  const sync = () => (isFullScreen.value = Boolean(document.fullscreenElement))

  async function toggle() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      // Refused, such as inside a frame that does not allow it: nothing changes.
    }
  }

  onMounted(() => document.addEventListener('fullscreenchange', sync))
  onBeforeUnmount(() => document.removeEventListener('fullscreenchange', sync))

  return { isFullScreen, isAvailable, toggle }
}
