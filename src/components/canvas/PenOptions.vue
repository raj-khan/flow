<script setup>
import { useCanvasStore } from '@/stores/canvas.js'
import ColorSwatches from './ColorSwatches.vue'

/** The pen's own settings, shown while it is on. */
const canvas = useCanvasStore()
</script>

<template>
  <div
    v-if="canvas.pen"
    role="toolbar"
    aria-label="Pen"
    class="nodrag nopan absolute top-16 left-1/2 z-10 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-xl border border-line bg-surface p-1 shadow-sm"
  >
    <ColorSwatches
      label="Pen colour"
      action="Draw in"
      plain="Draw in ink"
      :value="canvas.penColor"
      @pick="canvas.setPenColor"
    />
    <span class="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden="true" />
    <button
      type="button"
      class="flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs whitespace-nowrap text-muted hover:bg-hover hover:text-ink aria-pressed:bg-hover aria-pressed:text-ink"
      :aria-pressed="canvas.autoShapes"
      :title="
        canvas.autoShapes
          ? 'A drawn box, ellipse or diamond becomes that shape. Click to keep strokes as drawn'
          : 'Strokes stay as drawn. Click to turn a drawn box, ellipse or diamond into that shape'
      "
      @click="canvas.toggleAutoShapes"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M4 15c1-5 3-9 5-9s1 7 3 7 2-4 3-4" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
      Auto shapes
    </button>
  </div>
</template>
