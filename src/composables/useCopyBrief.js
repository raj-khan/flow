import { useRouter } from 'vue-router'

import { track } from '@/api/analytics.js'
import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { toBrief } from '@/domain/brief.js'
import { encodeShare } from '@/domain/shareLink.js'
import { ROUTE } from '@/router/index.js'
import { useToastStore } from '@/stores/toasts.js'

/**
 * Copy the diagram as a Markdown brief, ready to paste into a coding agent,
 * with a link to it so the agent can send back a link to its version.
 */
export function useCopyBrief() {
  const router = useRouter()
  const { document } = useFlowQuery()
  const toasts = useToastStore()

  async function copyBrief() {
    const page = new URL(router.resolve({ name: ROUTE.FLOW }).href, window.location.origin)
    const link = `${page}${await encodeShare(document.value)}`
    try {
      await navigator.clipboard.writeText(toBrief(document.value, { link }))
    } catch {
      toasts.push('The brief could not be copied. Your browser refused the clipboard.', {
        tone: 'danger',
      })
      return
    }

    track('brief_copied')
    toasts.push('Brief copied. Paste it into Claude, Copilot or any coding agent.')
  }

  return { copyBrief }
}
