import { onBeforeUnmount, onMounted } from 'vue'

import { useFlowHistory } from '@/composables/useFlowHistory.js'
import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { useReplaceDocument } from '@/composables/useNodeMutations.js'
import { diffDocuments } from '@/domain/diff.js'
import { parseFlow, serialiseFlow } from '@/domain/flowText.js'
import { useCanvasStore } from '@/stores/canvas.js'
import { useFileStore } from '@/stores/file.js'
import { useToastStore } from '@/stores/toasts.js'

/** How often the open file is looked at. A browser cannot be told when it changes. */
export const WATCH_MS = 1000

/**
 * Changes to the open file made elsewhere (an agent writing through MCP, an
 * editor) come in as they happen. With nothing unsaved here the file's version
 * is shown, as one undoable change, with what changed marked on the canvas;
 * with unsaved edits, the person is asked which to keep. The diagram's own
 * saves are recognised and ignored.
 */
export function useWatchFile() {
  const file = useFileStore()
  const { document } = useFlowQuery()
  const replace = useReplaceDocument('Reload from disk')
  const { undo } = useFlowHistory()
  const canvas = useCanvasStore()
  const toasts = useToastStore()
  let busy = false
  /** @type {number | undefined} */
  let timer

  async function check() {
    const handle = file.handle
    if (busy || !handle || !document.value || window.document.hidden || canvas.fileConflict) return
    busy = true
    try {
      const disk = await handle.getFile()
      if (disk.lastModified === file.modified || handle !== file.handle) return
      file.modified = disk.lastModified

      const { document: next, errors } = parseFlow(await disk.text())
      if (!next) {
        const [first] = errors
        toasts.push(
          `${file.name} changed on disk, but line ${first.line} has an error: ${first.message} Yours is kept.`,
          { tone: 'danger' },
        )
        return
      }

      const flow = serialiseFlow(next)
      if (flow === file.savedFlow) return
      if (serialiseFlow(document.value) !== file.savedFlow) {
        canvas.fileConflict = { name: file.name, document: next, flow }
        return
      }
      show(next, flow)
    } catch {
      // Permission withdrawn, or the file moved away: there is nothing to watch.
    } finally {
      busy = false
    }
  }

  /**
   * @param {import('@/domain/types.js').FlowDocument} next
   * @param {string} flow
   */
  function show(next, flow) {
    const before = document.value
    const name = file.name
    replace.mutate(next, {
      onSuccess() {
        file.savedFlow = flow
        if (before) canvas.flash(changesBetween(before, next))
        toasts.push(`${name} changed on disk. This is the new version.`, {
          action: { label: 'Undo', run: undo },
        })
      },
    })
  }

  /** The file's version wins over what is unsaved here. */
  function takeTheirs() {
    const conflict = canvas.fileConflict
    canvas.fileConflict = null
    if (conflict) show(conflict.document, conflict.flow)
  }

  /** What is here wins; the next Save writes it over the file. */
  function keepMine() {
    const conflict = canvas.fileConflict
    canvas.fileConflict = null
    if (conflict) file.savedFlow = conflict.flow
  }

  onMounted(() => (timer = window.setInterval(check, WATCH_MS)))
  onBeforeUnmount(() => window.clearInterval(timer))

  return { takeTheirs, keepMine }
}

/**
 * What is new or different, to mark; what is gone has nothing left to mark.
 * @param {import('@/domain/types.js').FlowDocument} before
 * @param {import('@/domain/types.js').FlowDocument} after
 * @returns {Map<string, 'added' | 'changed' | 'moved'>}
 */
export function changesBetween(before, after) {
  const diff = diffDocuments(before, after)
  return new Map([
    ...diff.nodes.added.map((id) => /** @type {const} */ ([id, 'added'])),
    ...diff.nodes.changed.map((id) => /** @type {const} */ ([id, 'changed'])),
    ...diff.nodes.moved.map((id) => /** @type {const} */ ([id, 'moved'])),
    ...diff.edges.added.map((id) => /** @type {const} */ ([id, 'added'])),
    ...diff.edges.changed.map((id) => /** @type {const} */ ([id, 'changed'])),
  ])
}
