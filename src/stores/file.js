import { shallowRef, ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * The file the diagram was opened from or last saved to. The handle cannot be
 * stored, so it lasts for the visit; the diagram itself is saved regardless.
 *
 * What the file last held, as `.flow` text, and when it was last written, let
 * a change on disk (an agent writing through MCP, an editor) be told from the
 * diagram's own saves, and unsaved edits here from none.
 */
export const useFileStore = defineStore('file', () => {
  /** @type {import('vue').ShallowRef<any>} a FileSystemFileHandle, where the browser has them */
  const handle = shallowRef(null)
  const name = ref('')
  /** The diagram as the file holds it, in the canonical `.flow` form. */
  const savedFlow = ref('')
  /** The file's lastModified when it was last read or written here. */
  const modified = ref(0)

  /**
   * @param {any} next
   * @param {string} fileName
   * @param {{ flow?: string, lastModified?: number }} [state]
   */
  function remember(next, fileName, { flow = '', lastModified = 0 } = {}) {
    handle.value = next
    name.value = fileName
    savedFlow.value = flow
    modified.value = lastModified
  }

  /** @param {string} flow @param {number} lastModified */
  function markSaved(flow, lastModified) {
    savedFlow.value = flow
    modified.value = lastModified
  }

  function forget() {
    handle.value = null
    name.value = ''
    savedFlow.value = ''
    modified.value = 0
  }

  return { handle, name, savedFlow, modified, remember, markSaved, forget }
})
