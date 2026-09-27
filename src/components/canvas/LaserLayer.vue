<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

/**
 * The laser pointer, for presenting: a glowing trail that follows the pointer
 * while it is pressed and fades behind it. Nothing is saved.
 */
const FADE_MS = 700

/** @type {import('vue').Ref<{ x: number, y: number, t: number }[]>} */
const trail = ref([])
const layer = ref(/** @type {HTMLElement | null} */ (null))
let isDown = false
let frame = 0

const points = computed(() => trail.value.map(({ x, y }) => `${x},${y}`).join(' '))

function fade() {
  const now = window.performance.now()
  trail.value = trail.value.filter((point) => now - point.t < FADE_MS)
  frame = trail.value.length ? window.requestAnimationFrame(fade) : 0
}

/** @param {PointerEvent} event */
function add(event) {
  if (!isDown || !layer.value) return
  const box = layer.value.getBoundingClientRect()
  trail.value = [
    ...trail.value,
    { x: event.clientX - box.left, y: event.clientY - box.top, t: window.performance.now() },
  ]
  if (!frame) frame = window.requestAnimationFrame(fade)
}

/** @param {PointerEvent} event */
function down(event) {
  if (event.button !== 0) return
  event.preventDefault()
  isDown = true
  add(event)
}

onBeforeUnmount(() => window.cancelAnimationFrame(frame))
</script>

<template>
  <div
    ref="layer"
    class="nodrag nopan absolute inset-0 z-[5] cursor-crosshair touch-none"
    data-testid="laser-layer"
    @pointerdown="down"
    @pointermove="add"
    @pointerup="isDown = false"
    @pointercancel="isDown = false"
    @pointerleave="isDown = false"
  >
    <svg class="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <polyline
        v-if="trail.length > 1"
        :points="points"
        fill="none"
        stroke="#ef4444"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
        data-testid="laser-trail"
        style="filter: drop-shadow(0 0 4px #ef4444)"
      />
    </svg>
  </div>
</template>
