<script setup>
import { computed, ref } from 'vue'
import { useVueFlow } from '@vue-flow/core'

import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { useReplaceDocument } from '@/composables/useNodeMutations.js'
import { SHAPE } from '@/domain/constants.js'
import { strokeToInk } from '@/domain/ink.js'
import { useCanvasStore } from '@/stores/canvas.js'

/**
 * The pen: while it is on, dragging on the canvas draws instead of panning.
 * Each stroke becomes a shape of its own, so it moves, resizes, deletes and
 * undoes like any other.
 */
const canvas = useCanvasStore()
const { screenToFlowCoordinate } = useVueFlow()
const { document } = useFlowQuery()
const draw = useReplaceDocument('Draw')

/** The stroke being drawn, in screen coordinates relative to the layer. */
/** @type {import('vue').Ref<{ x: number, y: number }[]>} */
const live = ref([])
/** The same points on the page, with a stylus's pressure, for the diagram at the end. */
/** @type {{ x: number, y: number, p?: number }[]} */
let onPage = []
/** The pointer drawing now; a second one, such as a resting palm, is ignored. */
let drawing = -1
/** Once a stylus has drawn, fingers are palms: they never draw. */
let stylusSeen = false
const layer = ref(/** @type {HTMLElement | null} */ (null))

const preview = computed(() => live.value.map(({ x, y }) => `${x},${y}`).join(' '))

/** @param {PointerEvent} event */
function start(event) {
  if (event.button !== 0) return
  if (event.pointerType === 'pen') stylusSeen = true
  if ((stylusSeen && event.pointerType === 'touch') || drawing !== -1) return
  drawing = event.pointerId
  event.preventDefault()
  const surface = /** @type {HTMLElement} */ (event.currentTarget)
  try {
    surface.setPointerCapture(event.pointerId)
  } catch {
    // A pointer the browser no longer tracks cannot be captured; the stroke still draws.
  }
  onPage = []
  live.value = []
  add(event)
}

/** @param {PointerEvent} event */
function add(event) {
  if (!layer.value || event.pointerId !== drawing) return
  if (event.type === 'pointermove' && !onPage.length) return
  const box = layer.value.getBoundingClientRect()
  const pressure = event.pointerType === 'pen' && event.pressure > 0 ? { p: event.pressure } : {}
  onPage.push({ x: event.clientX, y: event.clientY, ...pressure })
  live.value = [...live.value, { x: event.clientX - box.left, y: event.clientY - box.top }]
}

/** @param {PointerEvent} event */
function finish(event) {
  if (event.pointerId !== drawing) return
  drawing = -1
  const drawn = onPage.map(({ p, ...point }) => ({
    ...screenToFlowCoordinate(point),
    ...(p === undefined ? {} : { p }),
  }))
  onPage = []
  live.value = []
  const ink = strokeToInk(drawn)
  if (!ink || !document.value) return

  const taken = new Set(document.value.nodes.map((node) => String(node.id)))
  let n = 1
  while (taken.has(`ink-${n}`)) n += 1
  draw.mutate({
    ...document.value,
    nodes: [
      ...document.value.nodes,
      {
        id: `ink-${n}`,
        type: SHAPE.INK,
        name: '',
        data: { points: ink.points, ...(canvas.penColor ? { color: canvas.penColor } : {}) },
        position: ink.position,
        size: ink.size,
      },
    ],
  })
}
</script>

<template>
  <div
    v-if="canvas.pen"
    ref="layer"
    class="nodrag nopan absolute inset-0 z-[5] cursor-crosshair touch-none"
    data-testid="pen-layer"
    @pointerdown="start"
    @pointermove="add"
    @pointerup="finish"
    @pointercancel="finish"
  >
    <svg
      class="pointer-events-none absolute inset-0 h-full w-full text-ink"
      :style="canvas.penColor ? { color: `var(--paint-${canvas.penColor})` } : undefined"
      aria-hidden="true"
    >
      <polyline
        v-if="live.length > 1"
        :points="preview"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </div>
</template>
