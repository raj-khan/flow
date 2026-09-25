<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useVueFlow } from '@vue-flow/core'

import IconButton from '@/components/ui/IconButton.vue'
import { nextZoom } from '@/domain/zoom.js'
import { useLineStyle } from '@/composables/useLineStyle.js'
import { useCanvasStore } from '@/stores/canvas.js'
import { useTidyUp } from '@/composables/useTidyUp.js'
import { useToastStore } from '@/stores/toasts.js'
import { useFlowHistory } from '@/composables/useFlowHistory.js'
import { isCanvasKey } from '@/composables/canvasKeys.js'

/**
 * Instead of `@vue-flow/controls`, whose buttons carry no accessible name or
 * tooltip and style themselves outside our tokens. Same `useVueFlow` API.
 */
const { fitView, zoomTo, viewport, getSelectedNodes } = useVueFlow()

const percentage = computed(() => `${Math.round(viewport.value.zoom * 100)}%`)

const ZOOM_STEP = { duration: 140 }

const { lines, next, cycle } = useLineStyle()
const canvas = useCanvasStore()
const { tidyUp } = useTidyUp()
const toasts = useToastStore()
const { undo } = useFlowHistory()

function tidy() {
  tidyUp({
    onSuccess: () => {
      // After Vue Flow has moved the shapes, so the fit sees where they went.
      setTimeout(() => fitView({ padding: 0.2, duration: 200 }), 60)
      toasts.push('Laid out the whole diagram', { action: { label: 'Undo', run: undo } })
    },
  })
}
/** @type {Record<string, string>} */
const LINE_NAMES = { step: 'in steps', curved: 'curved', straight: 'straight' }

/** @param {1 | -1} direction */
const step = (direction) => zoomTo(nextZoom(viewport.value.zoom, direction), ZOOM_STEP)

const FIT = { padding: 0.2, duration: 200 }

/** Shift+2: the selection, or the whole diagram when nothing is selected. */
function fitSelection() {
  const ids = getSelectedNodes.value.map((node) => node.id)
  fitView(ids.length ? { ...FIT, nodes: ids, maxZoom: 1.5 } : FIT)
}

/**
 * Shift+1 and Shift+2, read from the physical keys so every layout agrees.
 * @param {KeyboardEvent} event
 */
function onKeydown(event) {
  if (!event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return
  if (!isCanvasKey(event)) return
  if (event.code === 'Digit1') {
    event.preventDefault()
    fitView(FIT)
  } else if (event.code === 'Digit2') {
    event.preventDefault()
    fitSelection()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <!-- Drawn beside undo, bottom left; it lives in Vue Flow for useVueFlow. -->
  <Teleport defer to="#canvas-controls">
    <div class="island flex items-center gap-0.5 p-1" role="toolbar" aria-label="View">
      <IconButton
        variant="bare"
        label="Zoom in"
        title="Zoom in to the next step. Scrolling on the canvas zooms freely"
        @click="step(1)"
      >
        <path d="M12 5v14M5 12h14" />
      </IconButton>

      <IconButton
        variant="bare"
        label="Zoom out"
        title="Zoom out to the previous step. Scrolling on the canvas zooms freely"
        @click="step(-1)"
      >
        <path d="M5 12h14" />
      </IconButton>

      <IconButton
        variant="bare"
        :label="`Lines: ${lines}`"
        :title="`Connections run ${LINE_NAMES[lines]}. Click for ${LINE_NAMES[next]}`"
        @click="cycle"
      >
        <path v-if="lines === 'curved'" d="M4 19C4 10 20 14 20 5" />
        <path v-else-if="lines === 'straight'" d="M4 19 20 5" />
        <path v-else d="M4 19v-7h16V5" />
      </IconButton>

      <IconButton
        variant="bare"
        label="Tidy up"
        title="Lay out the whole diagram automatically. Undo puts everything back"
        @click="tidy"
      >
        <rect x="9" y="3" width="6" height="5" rx="1" />
        <rect x="3" y="16" width="6" height="5" rx="1" />
        <rect x="15" y="16" width="6" height="5" rx="1" />
        <path d="M12 8v4M6 16v-4h12v4" />
      </IconButton>

      <IconButton
        variant="bare"
        label="Snap to grid"
        :title="canvas.snap ? 'Shapes snap to the grid as you drag them' : 'Shapes move freely'"
        :pressed="canvas.snap"
        @click="canvas.toggleSnap"
      >
        <path
          d="M4 4h.01M12 4h.01M20 4h.01M4 12h.01M12 12h.01M20 12h.01M4 20h.01M12 20h.01M20 20h.01"
          stroke-width="3"
        />
      </IconButton>

      <IconButton
        variant="bare"
        label="Fit to screen"
        title="Bring every node into view (Shift+1)"
        @click="fitView(FIT)"
      >
        <path
          d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"
        />
      </IconButton>

      <IconButton
        variant="bare"
        label="Minimap"
        :title="canvas.minimap ? 'Hide the minimap' : 'Show a minimap of the whole diagram'"
        :pressed="canvas.minimap"
        @click="canvas.toggleMinimap"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <rect x="12" y="11" width="6" height="5" rx="1" />
      </IconButton>

      <!-- The zoom level doubles as the control that resets it. -->
      <span :title="`Zoom is ${percentage}. Click to reset to 100%`">
        <button
          type="button"
          class="min-w-12 rounded-lg px-1.5 py-2 text-xs font-medium text-muted transition-colors hover:bg-hover"
          aria-label="Reset zoom to 100 percent"
          @click="zoomTo(1, ZOOM_STEP)"
        >
          {{ percentage }}
        </button>
      </span>
    </div>
  </Teleport>
</template>
