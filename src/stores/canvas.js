import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { STORAGE_KEYS } from '@/api/storageKeys.js'
import { TOOL } from '@/domain/tools.js'

/** A viewer's own habit, so it is kept in this browser, not in the diagram. */
function savedSnap() {
  try {
    return localStorage.getItem(STORAGE_KEYS.SNAP) !== 'off'
  } catch {
    return true
  }
}

/** The half of the state the server has no opinion about, so it never belongs in the cache. */
export const useCanvasStore = defineStore('canvas', () => {
  /** @type {import('vue').Ref<{ x: number, y: number, zoom: number } | null>} */
  const viewport = ref(null)

  /** Node the canvas should pan to next, such as one just created. */
  const focusNodeId = ref('')

  /** Whether the text pane is open beside the canvas. */
  const isTextOpen = ref(false)

  function toggleText() {
    isTextOpen.value = !isTextOpen.value
  }

  /** @type {import('vue').Ref<import('@/domain/tools.js').ToolId>} */
  const tool = ref(TOOL.SELECT)

  /** Whether the shape library is open over the canvas. */
  const isLibraryOpen = ref(false)

  /**
   * Shapes is not a mode: it opens or closes the library and leaves the tool.
   * @param {import('@/domain/tools.js').ToolId} next
   */
  function setTool(next) {
    if (next === TOOL.SHAPES) {
      isLibraryOpen.value = !isLibraryOpen.value
      return
    }
    tool.value = next
  }

  function closeLibrary() {
    isLibraryOpen.value = false
  }

  /** Whether the pen is down: dragging on the canvas draws instead of panning. */
  const pen = computed(() => tool.value === TOOL.PEN)

  function togglePen() {
    tool.value = pen.value ? TOOL.SELECT : TOOL.PEN
  }

  /** Whether dragged shapes snap to the grid of dots. On unless turned off. */
  const snap = ref(savedSnap())

  function toggleSnap() {
    snap.value = !snap.value
    try {
      localStorage.setItem(STORAGE_KEYS.SNAP, snap.value ? 'on' : 'off')
    } catch {
      // A private window refuses storage; the choice still holds until reload.
    }
  }

  /**
   * A shape asked for from outside the canvas, which alone knows where the
   * middle of the view is in diagram coordinates.
   */
  const pendingShape = ref('')

  /** @param {string} shape */
  function requestShape(shape) {
    pendingShape.value = shape
  }

  function clearShapeRequest() {
    pendingShape.value = ''
  }

  /** @param {{ x: number, y: number, zoom: number }} next */
  function setViewport(next) {
    viewport.value = next
  }

  /** A different diagram should be fitted to the screen, not shown where the last one was. */
  function forgetViewport() {
    viewport.value = null
  }

  /** @param {string} id */
  function requestFocus(id) {
    focusNodeId.value = id
  }

  function clearFocus() {
    focusNodeId.value = ''
  }

  return {
    viewport,
    focusNodeId,
    pendingShape,
    isTextOpen,
    toggleText,
    snap,
    toggleSnap,
    tool,
    setTool,
    isLibraryOpen,
    closeLibrary,
    pen,
    togglePen,
    setViewport,
    forgetViewport,
    requestFocus,
    clearFocus,
    requestShape,
    clearShapeRequest,
  }
})
