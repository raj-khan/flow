import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { useFlowHistory } from '@/composables/useFlowHistory.js'
import { useReplaceDocument } from '@/composables/useNodeMutations.js'
import { FLOW_EXTENSION, flowFileName, parseFlow, serialiseFlow } from '@/domain/flowText.js'
import { ROUTE } from '@/router/index.js'
import { useCanvasStore } from '@/stores/canvas.js'
import { useFileStore } from '@/stores/file.js'
import { useToastStore } from '@/stores/toasts.js'
import { downloadText } from '@/composables/download.js'

const PICKER_TYPES = [
  { description: 'isketch diagram', accept: { 'text/plain': [FLOW_EXTENSION] } },
]

/**
 * Open and save `.flow` files. Where the browser has the File System Access
 * API, Save writes back to the file that was opened, which is what lets a
 * diagram live in a repository; elsewhere it downloads a copy, and Open reads
 * one from a file input.
 *
 * Like undo, only one caller may bind the keys.
 *
 * @param {{ bindKeys?: boolean }} [options]
 */
export function useDiagramFile({ bindKeys = false } = {}) {
  const router = useRouter()
  const { document } = useFlowQuery()
  const replace = useReplaceDocument('Open file')
  const { undo } = useFlowHistory()
  const file = useFileStore()
  const canvas = useCanvasStore()
  const toasts = useToastStore()

  /**
   * @param {string} text
   * @param {string} name
   * @param {any} handle
   * @param {number} [lastModified]
   */
  function load(text, name, handle, lastModified = 0) {
    const { document: opened, errors } = parseFlow(text)
    if (!opened) {
      const [first] = errors
      toasts.push(`${name} could not be opened. Line ${first.line}: ${first.message}`, {
        tone: 'danger',
      })
      return
    }

    router.push({ name: ROUTE.FLOW })
    canvas.forgetViewport()
    replace.mutate(opened, {
      onSuccess() {
        file.remember(handle, name, { flow: serialiseFlow(opened), lastModified })
        toasts.push(`Opened ${name}`, { action: { label: 'Undo', run: undo } })
      },
    })
  }

  async function open() {
    const picker = /** @type {any} */ (window).showOpenFilePicker
    if (picker) {
      try {
        const [handle] = await picker({ types: PICKER_TYPES, multiple: false })
        const picked = await handle.getFile()
        load(await picked.text(), picked.name, handle, picked.lastModified)
      } catch (error) {
        if (/** @type {any} */ (error)?.name !== 'AbortError') {
          toasts.push('The file could not be opened.', { tone: 'danger' })
        }
      }
      return
    }

    const input = window.document.createElement('input')
    input.type = 'file'
    input.accept = FLOW_EXTENSION
    input.addEventListener('change', async () => {
      const picked = input.files?.[0]
      if (picked) load(await picked.text(), picked.name, null)
    })
    input.click()
  }

  async function save() {
    const text = serialiseFlow(document.value)

    if (file.handle) {
      try {
        await write(file.handle, text)
        file.markSaved(text, await lastModifiedOf(file.handle))
        toasts.push(`Saved to ${file.name}`)
        return
      } catch {
        // Permission withdrawn or the file moved: ask where instead.
        file.forget()
      }
    }

    const picker = /** @type {any} */ (window).showSaveFilePicker
    if (picker) {
      try {
        const handle = await picker({
          suggestedName: flowFileName(document.value.title),
          types: PICKER_TYPES,
        })
        await write(handle, text)
        file.remember(handle, handle.name, {
          flow: text,
          lastModified: await lastModifiedOf(handle),
        })
        toasts.push(`Saved to ${handle.name}`)
      } catch (error) {
        if (/** @type {any} */ (error)?.name !== 'AbortError') {
          toasts.push('The file could not be saved.', { tone: 'danger' })
        }
      }
      return
    }

    const name = flowFileName(document.value.title)
    downloadText(name, text)
    toasts.push(`Downloaded ${name}`)
  }

  /** @param {KeyboardEvent} event */
  function onKeydown(event) {
    if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey) return
    const key = event.key.toLowerCase()
    // Taken even in a text field: the browser's own Save and Open are never wanted here.
    if (key === 's') {
      event.preventDefault()
      save()
    } else if (key === 'o') {
      event.preventDefault()
      open()
    }
  }

  if (bindKeys) {
    onMounted(() => window.addEventListener('keydown', onKeydown, true))
    onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown, true))
  }

  return { open, save, openText: load, fileName: () => file.name }
}

/** @param {any} handle @param {string} text */
async function write(handle, text) {
  const writable = await handle.createWritable()
  await writable.write(text)
  await writable.close()
}

/** When a file was last written, or 0 when that cannot be read. @param {any} handle */
async function lastModifiedOf(handle) {
  try {
    return (await handle.getFile()).lastModified
  } catch {
    return 0
  }
}
