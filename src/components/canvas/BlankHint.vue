<script setup>
import { SAMPLES } from '@/domain/samples.js'
import { useCanvasStore } from '@/stores/canvas.js'

/**
 * A blank diagram is a blank canvas: this says how to begin, over the canvas
 * but never in the way of drawing on it, and offers the samples on request.
 */
const canvas = useCanvasStore()
defineEmits(['sample'])
</script>

<template>
  <div
    class="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center p-8"
    data-testid="blank-hint"
  >
    <div class="max-w-sm text-center">
      <p class="text-sm font-medium">A blank canvas</p>
      <p class="mt-1 text-xs text-muted">
        Draw with the pen, double-click to add a shape, type to name one, or drag one in from the
        shape library.
      </p>
      <button
        v-if="!canvas.samplesOpen"
        type="button"
        class="pointer-events-auto mt-3 text-xs text-muted underline underline-offset-2 hover:text-ink"
        title="Show the samples, to start from one instead"
        @click="canvas.openSamples"
      >
        Start from a sample
      </button>
      <ul v-else class="pointer-events-auto mt-4 grid gap-2" aria-label="Samples">
        <li v-for="sample in SAMPLES" :key="sample.id">
          <button
            type="button"
            class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-left transition-colors hover:bg-hover"
            :title="`Open the ${sample.title.toLowerCase()} sample. Undo brings back the blank canvas`"
            @click="$emit('sample', sample.id)"
          >
            <span class="block text-sm font-medium">{{ sample.title }}</span>
            <span class="block text-xs text-muted">{{ sample.description }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
