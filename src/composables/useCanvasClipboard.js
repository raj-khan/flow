import { onBeforeUnmount, onMounted } from 'vue'

import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { useReplaceDocument } from '@/composables/useNodeMutations.js'
import { copySelection, pasteInto } from '@/domain/clipboard.js'
import { parseFlow, serialiseFlow } from '@/domain/flowText.js'
import { useToastStore } from '@/stores/toasts.js'

/**
 * Copy, cut, paste and duplicate on the canvas. The clipboard carries `.flow`
 * text, so shapes paste between tabs, and into and out of a text editor or an
 * agent. Each paste is one undoable change.
 *
 * @param {{
 *   selectedIds: () => string[],
 *   remove: (ids: string[]) => void,
 *   select: (ids: string[]) => void,
 *   isBlocked: (event: Event) => boolean,
 * }} canvas
 */
export function useCanvasClipboard(canvas) {
  const { document } = useFlowQuery()
  const paste = useReplaceDocument('Paste')
  const duplicate = useReplaceDocument('Duplicate')
  const toasts = useToastStore()

  /** The last copy, and how often it has been pasted, so each lands further along. */
  let last = { text: '', times: 0 }

  const count = (/** @type {number} */ n) => (n === 1 ? 'a shape' : `${n} shapes`)

  /** @param {string[]} ids */
  function textOf(ids) {
    const text = serialiseFlow(copySelection(document.value, ids))
    last = { text, times: 0 }
    return text
  }

  /** @param {ClipboardEvent} event */
  function onCopy(event) {
    const ids = canvas.selectedIds()
    if (canvas.isBlocked(event) || !ids.length || !document.value) return
    event.preventDefault()
    event.clipboardData?.setData('text/plain', textOf(ids))
    toasts.push(`Copied ${count(ids.length)}`)
  }

  /** @param {ClipboardEvent} event */
  function onCut(event) {
    const ids = canvas.selectedIds()
    if (canvas.isBlocked(event) || !ids.length || !document.value) return
    event.preventDefault()
    event.clipboardData?.setData('text/plain', textOf(ids))
    canvas.remove(ids)
  }

  /** @param {ClipboardEvent} event */
  function onPaste(event) {
    if (canvas.isBlocked(event) || !document.value) return
    const text = event.clipboardData?.getData('text/plain') ?? ''
    const { document: copy } = parseFlow(text)
    // Anything else on the clipboard is not ours to take.
    if (!copy?.nodes.length) return
    event.preventDefault()

    last = text === last.text ? { text, times: last.times + 1 } : { text, times: 1 }
    const result = pasteInto(document.value, copy, last.times)
    paste.mutate(result.document, { onSuccess: () => canvas.select(result.ids) })
  }

  /** @param {KeyboardEvent} event */
  function onKeydown(event) {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'd') return
    const ids = canvas.selectedIds()
    if (canvas.isBlocked(event) || !ids.length || !document.value) return
    // The browser's own Ctrl+D bookmarks the page.
    event.preventDefault()
    duplicateShapes(ids)
  }

  /** Copies of these shapes, a step along, selected. @param {string[]} ids */
  function duplicateShapes(ids) {
    if (!document.value || !ids.length) return
    const result = pasteInto(document.value, copySelection(document.value, ids))
    duplicate.mutate(result.document, { onSuccess: () => canvas.select(result.ids) })
  }

  onMounted(() => {
    window.addEventListener('copy', onCopy)
    window.addEventListener('cut', onCut)
    window.addEventListener('paste', onPaste)
    window.addEventListener('keydown', onKeydown)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('copy', onCopy)
    window.removeEventListener('cut', onCut)
    window.removeEventListener('paste', onPaste)
    window.removeEventListener('keydown', onKeydown)
  })

  return { duplicate: duplicateShapes }
}
