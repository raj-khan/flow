import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { STORAGE_KEYS } from '@/api/storageKeys.js'
import { TOOL } from '@/domain/tools.js'
import { isColor } from '@/domain/colors.js'

/** How long a change made on disk stays marked on the canvas. */
export const FLASH_MS = 4000

/**
 * A viewer's own habit, so it is kept in this browser, not in the diagram. On
 * unless turned off.
 * @param {string} key
 */
function savedSwitch(key) {
  try {
    return localStorage.getItem(key) !== 'off'
  } catch {
    return true
  }
}

/** @param {string} key @param {boolean} on */
function saveSwitch(key, on) {
  try {
    localStorage.setItem(key, on ? 'on' : 'off')
  } catch {
    // A private window refuses storage; the choice still holds until reload.
  }
}

/** The pen's colour as last chosen, when it is still one of the palette. */
function savedColor() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PEN_COLOR)
    return isColor(saved) ? /** @type {string} */ (saved) : ''
  } catch {
    return ''
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

  /** The colour new pen strokes draw in; empty for ink. Kept in this browser. */
  const penColor = ref(savedColor())

  /** @param {string} color a ColorName, or '' for ink */
  function setPenColor(color) {
    penColor.value = isColor(color) ? color : ''
    try {
      localStorage.setItem(STORAGE_KEYS.PEN_COLOR, penColor.value)
    } catch {
      // A private window refuses storage; the colour still holds until reload.
    }
  }

  /** Whether a stroke that is plainly a box, an ellipse or a diamond becomes one. On unless turned off. */
  const autoShapes = ref(savedSwitch(STORAGE_KEYS.AUTO_SHAPES))

  function toggleAutoShapes() {
    autoShapes.value = !autoShapes.value
    saveSwitch(STORAGE_KEYS.AUTO_SHAPES, autoShapes.value)
  }

  /** Whether the blank canvas lists the samples to start from. */
  const samplesOpen = ref(false)

  function openSamples() {
    samplesOpen.value = true
  }

  function closeSamples() {
    samplesOpen.value = false
  }

  /** Whether dragged shapes snap to the grid of dots. On unless turned off. */
  const snap = ref(savedSwitch(STORAGE_KEYS.SNAP))

  function toggleSnap() {
    snap.value = !snap.value
    saveSwitch(STORAGE_KEYS.SNAP, snap.value)
  }

  /** Whether the minimap shows, bottom right. On unless turned off. */
  const minimap = ref(savedSwitch(STORAGE_KEYS.MINIMAP))

  function toggleMinimap() {
    minimap.value = !minimap.value
    saveSwitch(STORAGE_KEYS.MINIMAP, minimap.value)
  }

  /**
   * A diagram someone was sent, on a phone: shown fitted and read-only, with
   * Copy for AI and Edit, since most phone visits are someone reading a link.
   */
  const isViewing = ref(false)

  /** @param {boolean} on */
  function setViewing(on) {
    isViewing.value = on
  }

  /**
   * A view change asked for from outside the canvas, such as the command
   * palette; the view controls, inside Vue Flow, carry it out.
   * @type {import('vue').Ref<'' | 'fit' | 'selection' | 'tidy'>}
   */
  const viewRequest = ref('')

  /** @param {'fit' | 'selection' | 'tidy'} kind */
  function requestView(kind) {
    viewRequest.value = kind
  }

  function clearViewRequest() {
    viewRequest.value = ''
  }

  /** A frame to export on its own, asked for from its menu; empty for the whole diagram. */
  const exportFrame = ref('')
  /** Counts the asks, so asking twice for the same frame still opens Export. */
  const exportAsked = ref(0)

  /** @param {string} frameId */
  function requestExport(frameId) {
    exportFrame.value = frameId
    exportAsked.value += 1
  }

  /**
   * Shapes and connections that just changed on disk, marked for a few
   * seconds so a person can see what an agent did.
   * @type {import('vue').Ref<Map<string, 'added' | 'changed' | 'moved'>>}
   */
  const flashed = ref(new Map())
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let flashTimer

  /** @param {Map<string, 'added' | 'changed' | 'moved'>} changes */
  function flash(changes) {
    clearTimeout(flashTimer)
    flashed.value = changes
    flashTimer = setTimeout(() => (flashed.value = new Map()), FLASH_MS)
  }

  /**
   * The open file changed on disk while there are edits here not saved to it.
   * @type {import('vue').Ref<{ name: string, document: import('@/domain/types.js').FlowDocument, flow: string } | null>}
   */
  const fileConflict = ref(null)

  /** Zen mode: every tool hides until the pointer nears an edge. */
  const zen = ref(false)

  function toggleZen() {
    zen.value = !zen.value
    if (zen.value) isLibraryOpen.value = false
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
    minimap,
    toggleMinimap,
    zen,
    toggleZen,
    isViewing,
    setViewing,
    viewRequest,
    requestView,
    exportFrame,
    exportAsked,
    flashed,
    flash,
    fileConflict,
    requestExport,
    clearViewRequest,
    tool,
    setTool,
    isLibraryOpen,
    closeLibrary,
    pen,
    togglePen,
    penColor,
    setPenColor,
    autoShapes,
    toggleAutoShapes,
    samplesOpen,
    openSamples,
    closeSamples,
    setViewport,
    forgetViewport,
    requestFocus,
    clearFocus,
    requestShape,
    clearShapeRequest,
  }
})
