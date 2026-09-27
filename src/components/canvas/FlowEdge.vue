<script setup>
import { computed, inject, ref } from 'vue'
import { BaseEdge, EdgeLabelRenderer } from '@vue-flow/core'
import { useCanvasStore } from '@/stores/canvas.js'

/** Carries its own remove control, since an edge is otherwise only deletable by key. */
const props = defineProps({
  id: { type: String, required: true },
  sourceX: { type: Number, required: true },
  sourceY: { type: Number, required: true },
  targetX: { type: Number, required: true },
  targetY: { type: Number, required: true },
  sourcePosition: {
    type: /** @type {import('vue').PropType<import('@vue-flow/core').Position>} */ (String),
    required: true,
  },
  targetPosition: {
    type: /** @type {import('vue').PropType<import('@vue-flow/core').Position>} */ (String),
    required: true,
  },
  selected: { type: Boolean, default: false },
  label: { type: String, default: '' },
  data: {
    type: /** @type {import('vue').PropType<{ dashed?: boolean, both?: boolean }>} */ (Object),
    default: () => ({}),
  },
  /** Vue Flow's own nodes, for their live position and measured size. */
  sourceNode: { type: Object, default: null },
  targetNode: { type: Object, default: null },
})

/** Just changed on disk: marked for a few seconds. */
const canvasStore = useCanvasStore()
const flash = computed(() => canvasStore.flashed.get(props.id) ?? '')

/** @type {(edgeId: string) => void} */
const detach = inject(DETACH_EDGE, () => {})

const edit = inject(EDIT_TEXT, null)
const isEditing = computed(() => edit?.editingId.value === props.id)

/** @param {string} label */
function relabel(label) {
  if (label.trim() !== props.label) edit?.relabelEdge(props.id, label)
  edit?.stop()
}
const hovered = ref(false)

/** @param {any} node */
const boxOf = (node) => ({
  x: node?.computedPosition?.x ?? node?.position?.x ?? 0,
  y: node?.computedPosition?.y ?? node?.position?.y ?? 0,
  width: node?.dimensions?.width || node?.width || 0,
  height: node?.dimensions?.height || node?.height || 0,
})

const lines = inject(LINE_STYLE, ref('step'))
/** The same route the SVG export draws: out of the side facing the other shape. */
const route = computed(() =>
  props.sourceNode && props.targetNode
    ? routeEdge(boxOf(props.sourceNode), boxOf(props.targetNode), lines.value)
    : {
        d: `M${props.sourceX},${props.sourceY} L${props.targetX},${props.targetY}`,
        label: { x: (props.sourceX + props.targetX) / 2, y: (props.sourceY + props.targetY) / 2 },
      },
)
const d = computed(() => route.value.d)

const sketch = inject(SKETCH, ref(false))
/** Drawn by hand, the line wobbles; the hit area below stays the clean path. */
const drawn = computed(() => (sketch.value ? sketchPath(d.value, props.id) : d.value))

const styleEdge = inject(STYLE_EDGE, () => {})
const dashed = computed(() => Boolean(props.data?.dashed))
const both = computed(() => Boolean(props.data?.both))
const arrow = computed(() => `url(#${props.selected ? ARROW.SELECTED : ARROW.PLAIN})`)

const showRemove = computed(() => props.selected || hovered.value)
</script>

<script>
import { DETACH_EDGE } from './connectKey.js'
import { EDIT_TEXT } from './editKey.js'
import InlineText from './InlineText.vue'
import { LINE_STYLE, SKETCH } from './sketchKey.js'
import { ARROW, STYLE_EDGE } from './connectKey.js'
import { routeEdge } from '@/domain/routes.js'
import { sketchPath } from '@/domain/sketch.js'
</script>

<template>
  <BaseEdge
    :id="id"
    :path="drawn"
    :marker-end="arrow"
    :marker-start="both ? arrow : undefined"
    :style="{ strokeWidth: selected ? 2.5 : 1.5, strokeDasharray: dashed ? '6 4' : undefined }"
    :class="[selected ? 'stroke-focus' : '', flash ? `flash-edge flash-${flash}` : '']"
  />

  <!-- A wide transparent path, so the thin line is easy to hit. -->
  <path
    :d="d"
    fill="none"
    stroke="transparent"
    stroke-width="18"
    class="cursor-pointer"
    data-testid="edge-hit-area"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @dblclick.stop="edit?.start(id)"
  />

  <EdgeLabelRenderer>
    <div
      v-if="isEditing"
      class="nodrag nopan pointer-events-auto absolute w-40"
      :style="{
        transform: `translate(-50%, -50%) translate(${route.label.x}px, ${route.label.y}px)`,
      }"
    >
      <InlineText
        class="text-xs"
        :value="label"
        label="Connection label"
        @save="relabel"
        @cancel="edit?.stop()"
      />
    </div>

    <div
      v-else-if="label || showRemove"
      class="nodrag nopan pointer-events-auto absolute flex items-center gap-1"
      :style="{
        transform: `translate(-50%, -50%) translate(${route.label.x}px, ${route.label.y}px)`,
      }"
      @mouseenter="hovered = true"
      @mouseleave="hovered = false"
    >
      <span
        v-if="label"
        class="rounded-full border border-line bg-surface px-2 py-0.5 font-medium text-muted"
        :class="sketch ? 'font-sketch text-[13px]' : 'text-[11px]'"
        data-testid="edge-label"
        title="Double-click to edit the label"
        @dblclick.stop="edit?.start(id)"
      >
        {{ label }}
      </span>

      <template v-if="showRemove">
        <button
          type="button"
          class="flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface shadow-sm hover:text-ink"
          :class="dashed ? 'text-ink' : 'text-muted'"
          :aria-pressed="dashed ? 'true' : 'false'"
          aria-label="Dashed line"
          title="Dashed, for something optional or asynchronous"
          @click.stop="styleEdge(id, { dashed: !dashed })"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            aria-hidden="true"
          >
            <path d="M3 12h4M10 12h4M17 12h4" />
          </svg>
        </button>
        <button
          type="button"
          class="flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface shadow-sm hover:text-ink"
          :class="both ? 'text-ink' : 'text-muted'"
          :aria-pressed="both ? 'true' : 'false'"
          aria-label="Arrows both ways"
          title="An arrow at each end, for a two-way connection"
          @click.stop="styleEdge(id, { both: !both })"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            aria-hidden="true"
          >
            <path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4" />
          </svg>
        </button>
      </template>

      <button
        v-if="showRemove"
        type="button"
        class="flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-sm hover:text-danger"
        :aria-label="`Remove this connection`"
        title="Remove this connection. Both nodes stay"
        @click.stop="detach(id)"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          aria-hidden="true"
        >
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  </EdgeLabelRenderer>
</template>
