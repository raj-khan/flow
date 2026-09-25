import { track } from '@/api/analytics.js'
import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { toBrief } from '@/domain/brief.js'
import { useToastStore } from '@/stores/toasts.js'

/** Copy the diagram as a Markdown brief, ready to paste into a coding agent. */
export function useCopyBrief() {
  const { document } = useFlowQuery()
  const toasts = useToastStore()

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(toBrief(document.value))
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
