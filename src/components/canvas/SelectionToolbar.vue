<script setup>
import { computed } from 'vue'
import { useVueFlow } from '@vue-flow/core'

import { useMoveNodes } from '@/composables/useNodeMutations.js'
import { ALIGN, alignBoxes, distributeBoxes } from '@/domain/arrange.js'

/** Align and distribute, shown while two or more shapes are selected. */
const { getSelectedNodes } = useVueFlow()
const moveNodes = useMoveNodes()

const count = computed(() => getSelectedNodes.value.length)

/** Where each selected shape is, at the size it was drawn. */
const boxes = () =>
  getSelectedNodes.value.map((node) => ({
    id: node.id,
    x: node.computedPosition?.x ?? node.position.x,
    y: node.computedPosition?.y ?? node.position.y,
    width: node.dimensions?.width ?? 0,
    height: node.dimensions?.height ?? 0,
  }))

/** @param {Record<string, { x: number, y: number }>} positions */
function move(positions) {
  const moved = getSelectedNodes.value.filter((node) => {
    const next = positions[node.id]
    return next && (next.x !== node.position.x || next.y !== node.position.y)
  })
  if (!moved.length) return
  // The canvas follows the cache, so shapes move once the change is applied.
  moveNodes.mutate({ positions })
}

const ALIGNMENTS = [
  { mode: ALIGN.LEFT, label: 'Align left', d: 'M4 3v18M8 7h12M8 15h7' },
  { mode: ALIGN.CENTER, label: 'Align centres', d: 'M12 3v18M6 7h12M8 15h8' },
  { mode: ALIGN.RIGHT, label: 'Align right', d: 'M20 3v18M4 7h12M9 15h7' },
  { mode: ALIGN.TOP, label: 'Align tops', d: 'M3 4h18M7 8v12M15 8v7' },
  { mode: ALIGN.MIDDLE, label: 'Align middles', d: 'M3 12h18M7 6v12M15 8v8' },
  { mode: ALIGN.BOTTOM, label: 'Align bottoms', d: 'M3 20h18M7 4v12M15 9v7' },
]
const DISTRIBUTIONS = [
  { axis: 'horizontal', label: 'Distribute across', d: 'M4 4v16M20 4v16M10 8h4v8h-4z' },
  { axis: 'vertical', label: 'Distribute down', d: 'M4 4h16M4 20h16M8 10h8v4H8z' },
]
</script>

<template>
  <div
    v-if="count >= 2"
    role="toolbar"
    aria-label="Arrange the selection"
    class="nodrag nopan absolute top-16 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-line bg-surface p-1 shadow-sm"
  >
    <span class="px-2 text-xs text-muted">{{ count }} selected</span>
    <button
      v-for="option in ALIGNMENTS"
      :key="option.mode"
      type="button"
      class="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-ink"
      :aria-label="option.label"
      :title="option.label"
      @click="move(alignBoxes(boxes(), option.mode))"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path :d="option.d" />
      </svg>
    </button>
    <span class="mx-1 h-5 w-px bg-line" aria-hidden="true" />
    <button
      v-for="option in DISTRIBUTIONS"
      :key="option.axis"
      type="button"
      class="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-ink disabled:opacity-40"
      :aria-label="option.label"
      :title="
        count < 3
          ? `${option.label}: select three or more shapes`
          : `${option.label}, with equal gaps`
      "
      :disabled="count < 3"
      @click="
        move(distributeBoxes(boxes(), /** @type {'horizontal' | 'vertical'} */ (option.axis)))
      "
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path :d="option.d" />
      </svg>
    </button>
  </div>
</template>
