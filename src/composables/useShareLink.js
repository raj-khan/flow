import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { track } from '@/api/analytics.js'
import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { useFlowHistory } from '@/composables/useFlowHistory.js'
import { useReplaceDocument } from '@/composables/useNodeMutations.js'
import { decodeShare, encodeShare, LONG_LINK, SHARE_PREFIX } from '@/domain/shareLink.js'
import { ROUTE } from '@/router/index.js'
import { useCanvasStore } from '@/stores/canvas.js'
import { useFileStore } from '@/stores/file.js'
import { useToastStore } from '@/stores/toasts.js'

/** Copy a link that carries the whole diagram. */
export function useShareLink() {
  const router = useRouter()
  const { document } = useFlowQuery()
  const toasts = useToastStore()

  async function share() {
    const hash = await encodeShare(document.value)
    const url = `${new URL(router.resolve({ name: ROUTE.FLOW }).href, window.location.origin)}${hash}`

    try {
      await navigator.clipboard.writeText(url)
    } catch {
      toasts.push('The link could not be copied. Your browser refused the clipboard.', {
        tone: 'danger',
      })
      return
    }

    toasts.push(
      url.length > LONG_LINK
        ? 'Link copied. It is long, so some apps may cut it off.'
        : 'Link copied. Anyone who opens it gets their own copy of this diagram.',
    )
  }

  return { share }
}

/**
 * Open a diagram carried in the URL, once the one saved here has loaded, so undo
 * can bring that one back. The fragment is cleared afterwards: a reload should
 * not open the link again over later edits.
 */
export function useOpenSharedLink() {
  const route = useRoute()
  const router = useRouter()
  const { isLoading } = useFlowQuery()
  const replace = useReplaceDocument('Open shared diagram')
  const { undo } = useFlowHistory()
  const canvas = useCanvasStore()
  const file = useFileStore()
  const toasts = useToastStore()

  watch(
    [isLoading, () => route.hash],
    async ([loading, hash]) => {
      if (loading || !hash.startsWith(SHARE_PREFIX)) return

      const shared = await decodeShare(hash)
      router.replace({ name: ROUTE.FLOW, hash: '' })

      if (!shared) {
        toasts.push('This link does not hold a diagram isketch can read.', { tone: 'danger' })
        return
      }

      canvas.forgetViewport()
      file.forget()
      replace.mutate(shared, {
        onSuccess: () => {
          track('opened_from_link')
          toasts.push('Opened a shared diagram. Undo brings yours back.', {
            action: { label: 'Undo', run: undo },
          })
        },
      })
    },
    { immediate: true },
  )
}
