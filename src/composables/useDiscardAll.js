import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { useFlowHistory } from '@/composables/useFlowHistory.js'
import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { useReplaceDocument } from '@/composables/useNodeMutations.js'
import { withNothingDrawn } from '@/domain/document.js'
import { ROUTE } from '@/router/index.js'
import { useToastStore } from '@/stores/toasts.js'

/**
 * Discard all, as Excalidraw's Reset the canvas: a clean sheet of the same
 * diagram, keeping its title, notes, look and file. No confirmation, as with
 * New diagram: the toast's Undo, or any undo, brings it all back.
 */
export function useDiscardAll() {
  const router = useRouter()
  const { document } = useFlowQuery()
  const clear = useReplaceDocument('Discard all')
  const { undo } = useFlowHistory()
  const toasts = useToastStore()

  const isEmpty = computed(() => !document.value?.nodes.length)

  function discardAll() {
    if (!document.value || isEmpty.value) return
    const count = document.value.nodes.length
    // The open shape is about to go.
    router.push({ name: ROUTE.FLOW })
    clear.mutate(withNothingDrawn(document.value), {
      onSuccess: () =>
        toasts.push(`Discarded ${count} shape${count === 1 ? '' : 's'}.`, {
          action: { label: 'Undo', run: undo },
        }),
    })
  }

  return { discardAll, isEmpty }
}
