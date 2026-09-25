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
/** The same points on the page, for the diagram's coordinates at the end. */
/** @type {{ x: number, y: number }[]} */
let onPage = []
const layer = ref(/** @type {HTMLElement | null} */ (null))

const preview = computed(() => live.value.map(({ x, y }) => `${x},${y}`).join(' '))

/** @param {PointerEvent} event */
function start(event) {
  if (event.button !== 0) return
  event.preventDefault()
  const surface = /** @type {HTMLElement} */ (event.currentTarget)
  surface.setPointerCapture(event.pointerId)
  onPage = []
  live.value = []
  add(event)
}

/** @param {PointerEvent} event */
function add(event) {
  if (!layer.value || (event.type === 'pointermove' && !onPage.length)) return
  const box = layer.value.getBoundingClientRect()
  onPage.push({ x: event.clientX, y: event.clientY })
  live.value = [...live.value, { x: event.clientX - box.left, y: event.clientY - box.top }]
}

function finish() {
  const drawn = onPage.map((point) => screenToFlowCoordinate(point))
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
        data: { points: ink.points },
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
    <svg class="pointer-events-none absolute inset-0 h-full w-full text-ink" aria-hidden="true">
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
