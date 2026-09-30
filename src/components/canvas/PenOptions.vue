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
  </div>
</template>
