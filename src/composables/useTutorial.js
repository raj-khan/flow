import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { STORAGE_KEYS } from '@/api/storageKeys.js'
import { SHARE_PREFIX } from '@/domain/shareLink.js'
import { youtubeId } from '@/domain/youtube.js'

/** isketch's own tutorial on YouTube, unless the build names another. */
const VIDEO = youtubeId(import.meta.env.VITE_TUTORIAL_VIDEO ?? 'capRfYtliec')

function seen() {
  try {
    return localStorage.getItem(STORAGE_KEYS.TUTORIAL_SEEN) === 'yes'
  } catch {
    // A private window refuses storage: better to show it each visit than never.
    return false
  }
}

/**
 * The tutorial video: opened once for someone new, and from its button after.
 * Someone who came by a shared link came to see that diagram, so it waits.
 */
export function useTutorial() {
  const route = useRoute()
  const isOpen = ref(false)

  const open = () => (isOpen.value = true)

  function close() {
    isOpen.value = false
    try {
      localStorage.setItem(STORAGE_KEYS.TUTORIAL_SEEN, 'yes')
    } catch {
      // Nothing to remember it in; it shows again next visit.
    }
  }

  onMounted(() => {
    if (VIDEO && !seen() && !route.hash.startsWith(SHARE_PREFIX)) open()
  })

  return { video: VIDEO, isOpen, open, close }
}
