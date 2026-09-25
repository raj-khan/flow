<script setup>
import ShapeIcon from '@/components/ui/ShapeIcon.vue'
import { SHAPE_OPTIONS } from '@/domain/nodeMeta.js'
import { SHAPE_DRAG_TYPE } from './dragType.js'
import { useCanvasStore } from '@/stores/canvas.js'

/**
 * Every shape in the registry, in a panel the Shapes tool opens over the canvas.
 * Drag one onto the canvas, or click to add it in the middle.
 */
const emit = defineEmits(['add'])
const canvas = useCanvasStore()

/** Diagram shapes first, then the ones for sketching an interface. */
const GROUPS = [
  { id: 'diagram', title: 'Shapes' },
  { id: 'wireframe', title: 'Wireframe' },
].map((group) => ({
  ...group,
  options: SHAPE_OPTIONS.filter((option) => option.group === group.id),
}))

/**
 * @param {DragEvent} event
 * @param {string} shape
 */
function onDragStart(event, shape) {
  if (!event.dataTransfer) return
  event.dataTransfer.setData(SHAPE_DRAG_TYPE, shape)
  event.dataTransfer.effectAllowed = 'copy'
}

/** The library gets out of the way once a shape is on the canvas. */
/** @param {string} shape */
function add(shape) {
  emit('add', shape)
  canvas.closeLibrary()
}
</script>

<template>
  <aside class="island flex max-h-full w-72 flex-col" aria-label="Shapes">
    <header class="flex items-center justify-between px-3 pt-2.5">
      <p class="text-xs text-muted">Drag onto the canvas, or click to add</p>
      <button
        type="button"
        class="rounded-md p-1 text-muted hover:bg-hover"
        aria-label="Close shapes"
        title="Close the library (Esc)"
        @click="canvas.closeLibrary"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
    </header>

    <div class="scroll-panel min-h-0 flex-1 px-2 pb-3">
      <section v-for="group in GROUPS" :key="group.id" :aria-labelledby="`palette-${group.id}`">
        <h2
          :id="`palette-${group.id}`"
          class="px-2 pt-3 pb-1.5 text-xs font-semibold tracking-wide text-muted uppercase"
        >
          {{ group.title }}
        </h2>

        <ul class="grid grid-cols-2 gap-0.5">
          <li v-for="option in group.options" :key="option.value">
            <button
              type="button"
              draggable="true"
              class="flex w-full cursor-grab items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-hover active:cursor-grabbing"
              :title="`${option.hint}. Drag onto the canvas, or click to add it in the middle`"
              :data-shape="option.value"
              @dragstart="onDragStart($event, option.value)"
              @click="add(option.value)"
            >
              <ShapeIcon :shape="option.value" class="shrink-0 text-muted" />
              <span class="truncate">{{ option.label }}</span>
            </button>
          </li>
        </ul>
      </section>
    </div>
  </aside>
</template>
