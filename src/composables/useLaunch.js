import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useDiagramFile } from '@/composables/useDiagramFile.js'
import { useFlowHistory } from '@/composables/useFlowHistory.js'
import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { useReplaceDocument } from '@/composables/useNodeMutations.js'
import { readSharedText } from '@/domain/sharedText.js'
import { ROUTE } from '@/router/index.js'
import { useCanvasStore } from '@/stores/canvas.js'
import { useFileStore } from '@/stores/file.js'
import { useToastStore } from '@/stores/toasts.js'

/**
 * How the installed app is opened by the system: a `.flow` file opened with
 * isketch (file handlers), or text shared to it (the share target sends it
 * as `?text=`). Either opens as an undoable change, once the diagram saved
 * here has loaded, so undo can bring that one back.
 */
export function useLaunch() {
  const route = useRoute()
  const router = useRouter()
  const { isLoading } = useFlowQuery()
  const { openText } = useDiagramFile()
  const replace = useReplaceDocument('Open shared text')
  const { undo } = useFlowHistory()
  const canvas = useCanvasStore()
  const file = useFileStore()
  const toasts = useToastStore()

  const launchQueue = /** @type {any} */ (window).launchQueue
  launchQueue?.setConsumer(async (/** @type {{ files?: any[] }} */ params) => {
    const [handle] = params.files ?? []
    if (!handle) return
    const opened = await handle.getFile()
    openText(await opened.text(), opened.name, handle)
  })

  watch(
    [isLoading, () => route.query],
    ([loading, query]) => {
      const shared = ['text', 'title', 'url'].map((key) => String(query[key] ?? ''))
      if (loading || !shared.some(Boolean)) return

      const [text, title, url] = shared
      router.replace({ name: ROUTE.FLOW, query: {} })
      const document = readSharedText({ text, title, url })
      if (!document) {
        toasts.push('What was shared is not a diagram isketch can read.', { tone: 'danger' })
        return
      }

      canvas.forgetViewport()
      file.forget()
      replace.mutate(document, {
        onSuccess: () =>
          toasts.push('Opened what was shared. Undo brings yours back.', {
            action: { label: 'Undo', run: undo },
          }),
      })
    },
    { immediate: true },
  )
}
