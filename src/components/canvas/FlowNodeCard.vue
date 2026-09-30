<script setup>
import { computed, inject, ref } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { NodeResizer } from '@vue-flow/node-resizer'

import { metaFor } from '@/domain/nodeMeta.js'
import { MIN_NODE_SIZE, SHAPE, sizeOf } from '@/domain/constants.js'
import { useShiftKey } from '@/composables/useShiftKey.js'
import { RESIZE_NODE } from './resizeKey.js'
import { SKETCH } from './sketchKey.js'
import { sketchPath } from '@/domain/sketch.js'
import { inkOutline, inkPath } from '@/domain/ink.js'
import { shapePath, textInset } from '@/domain/shapes.js'
import { accentClasses } from './accents.js'
import { colorOf } from '@/domain/colors.js'
import { FOCUSED_NODE_ID } from './focusKey.js'
import { CONNECT_STATE } from './connectKey.js'
import { EDIT_TEXT } from './editKey.js'
import InlineText from './InlineText.vue'
import { FIELD_LIMIT } from '@/domain/validators.js'
import { useCanvasStore } from '@/stores/canvas.js'

/** One card for every shape: the registry supplies the meaning, `shapes.js` the outline. */
const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  /** Measured by Vue Flow, and live while a resize is under way. */
  dimensions: {
    type: /** @type {import('vue').PropType<{ width: number, height: number }>} */ (Object),
    default: () => ({ width: 0, height: 0 }),
  },
})

/** @type {import('vue').Ref<string>} */
const focusedId = inject(FOCUSED_NODE_ID, ref(''))
const isKeyboardFocused = computed(() => focusedId.value === props.id)

/** @type {import('./connectKey.js').ConnectContext} */
const connect = inject(CONNECT_STATE, { from: ref(''), accepts: () => false })

const edit = inject(EDIT_TEXT, null)
const isEditing = computed(() => edit?.editingId.value === props.id)

/** @param {string} name */
function rename(name) {
  const next = name.trim()
  // An empty title is not a title: leaving it empty keeps the old one.
  if (next && next !== node.value.name) edit?.renameNode(props.id, next)
  edit?.stop()
}

const isConnectSource = computed(() => connect.from.value === props.id)
const isDropTarget = computed(() => Boolean(connect.from.value) && !isConnectSource.value)
const acceptsDrop = computed(() => isDropTarget.value && connect.accepts(props.id))

const node = computed(() => props.data.node)
const meta = computed(() => metaFor(node.value.type))
const accent = computed(() => accentClasses(meta.value.accent))
/** A colour of the person's own: the outline in it, filled with its tint, over the kind's accent. */
const color = computed(() => colorOf(node.value))
const paint = computed(() => (color.value ? { color: `var(--paint-${color.value})` } : undefined))
const tint = computed(() =>
  color.value ? { fill: `var(--paint-${color.value}-soft)` } : undefined,
)

const description = computed(() => meta.value.summary(node.value))

/** The live size while resizing, else the saved one. */
const size = computed(() =>
  props.dimensions.width && props.dimensions.height ? props.dimensions : sizeOf(node.value),
)
const outline = computed(() => shapePath(node.value.type, size.value.width, size.value.height, 1.5))
const sketch = inject(SKETCH, ref(false))
/** Drawn by hand: the clean outline still fills, and this wobbly one strokes over it. */
const drawn = computed(() => (sketch.value ? sketchPath(outline.value, props.id) : ''))
/**
 * Handwriting runs small and has one weight, so a sketch's titles go a size
 * up rather than bold.
 */
const titleSize = computed(() => {
  if (sketch.value) return isText.value ? 'text-xl' : 'text-lg leading-tight'
  return isText.value ? 'text-base font-semibold' : 'text-sm font-semibold'
})
const inset = computed(() => textInset(node.value.type, size.value.width, size.value.height))

const resize = inject(RESIZE_NODE, () => {})
const shiftHeld = useShiftKey()

/** @param {{ params: { x: number, y: number, width: number, height: number } }} event */
function onResizeEnd({ params }) {
  resize(props.id, params)
}
/** Just changed on disk, by an agent or an editor: marked for a few seconds. */
const canvasStore = useCanvasStore()
const flash = computed(() => canvasStore.flashed.get(props.id) ?? '')
const isText = computed(() => node.value.type === SHAPE.TEXT)
/** A frame: a region behind the shapes it holds, named at its top left. */
const isFrame = computed(() => node.value.type === SHAPE.FRAME)
const isDecision = computed(() => node.value.type === SHAPE.DECISION)
const isTable = computed(() => node.value.type === SHAPE.TABLE)
/** A pen stroke: just its line, with no text, outline or connections. */
const isInk = computed(() => node.value.type === SHAPE.INK)
/** A stylus stroke is a filled outline that swells with the pressure. */
const inkFill = computed(() =>
  isInk.value ? inkOutline(node.value.data?.points, size.value.width, size.value.height) : '',
)
const inkD = computed(() =>
  isInk.value ? inkPath(node.value.data?.points, size.value.width, size.value.height) : '',
)
/** Notes are for the builder, so the canvas only marks that there are some. */
const notes = computed(() => node.value.data?.notes?.trim() ?? '')

/** Selection and keyboard focus draw on the outline itself, since a ring would be a rectangle. */
const strokeWidth = computed(() => (props.selected || isKeyboardFocused.value ? 3 : 1.5))
</script>

<template>
  <div
    class="relative flex flex-col items-center transition-opacity duration-150"
    :class="[
      sketch ? 'font-sketch' : '',
      // A table reads top down: its name in the band, its columns below.
      isFrame
        ? 'items-start justify-start text-left'
        : isTable
          ? 'justify-start pt-1.5 text-left'
          : 'justify-center text-center',
      isDropTarget && !acceptsDrop ? 'opacity-40' : '',
      isKeyboardFocused ? 'outline-2 outline-offset-4 outline-focus' : '',
      meta.openable ? 'cursor-pointer' : 'cursor-default',
      flash ? `flash flash-${flash}` : '',
    ]"
    :data-flash="flash || undefined"
    :aria-current="isKeyboardFocused ? 'true' : undefined"
    :style="{
      // The wrapper carries the size, so a resize handle can change it.
      width: '100%',
      height: '100%',
      // A diamond's inset already leaves room; padding on top would leave none for text.
      padding: isFrame ? '10px 14px' : isTable ? undefined : `${inset.y + 8}px ${inset.x || 12}px`,
      paddingInline: isTable ? '12px' : undefined,
    }"
    :aria-label="`${meta.label}: ${node.name}${notes ? ', has notes for the builder' : ''}`"
    :data-shape="node.type"
    @dblclick="isInk || edit?.start(id)"
  >
    <NodeResizer
      :is-visible="selected && !isEditing"
      :min-width="MIN_NODE_SIZE.WIDTH"
      :min-height="MIN_NODE_SIZE.HEIGHT"
      :keep-aspect-ratio="shiftHeld"
      color="var(--focus)"
      @resize-end="onResizeEnd"
    />

    <svg
      v-if="isInk"
      class="pointer-events-none absolute inset-0 overflow-visible text-ink"
      :style="paint"
      :width="size.width"
      :height="size.height"
      :viewBox="`0 0 ${size.width} ${size.height}`"
      aria-hidden="true"
      data-testid="ink-stroke"
    >
      <path
        v-if="inkFill"
        :d="inkFill"
        fill="currentColor"
        :stroke="selected ? 'currentColor' : 'none'"
        stroke-width="1"
      />
      <path
        v-else
        :d="inkD"
        fill="none"
        stroke="currentColor"
        :stroke-width="selected ? 3.5 : 2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <!-- Wide and clear, so the line is easy to pick up; see .ink-hit in style.css. -->
      <path
        :d="inkD"
        class="ink-hit"
        fill="none"
        stroke="transparent"
        stroke-width="14"
        stroke-linecap="round"
      />
    </svg>

    <svg
      v-else-if="outline"
      class="pointer-events-none absolute inset-0 overflow-visible"
      :class="acceptsDrop ? 'text-node-message' : color ? '' : accent.icon"
      :style="acceptsDrop ? undefined : paint"
      :data-color="color || undefined"
      :width="size.width"
      :height="size.height"
      :viewBox="`0 0 ${size.width} ${size.height}`"
      aria-hidden="true"
    >
      <path
        :d="outline"
        class="transition-[stroke-width] duration-150"
        :class="tint ? '' : isFrame ? 'frame-fill' : 'fill-surface'"
        :style="tint"
        :fill-opacity="tint && isFrame ? 0.45 : undefined"
        :stroke="drawn ? 'none' : 'currentColor'"
        :stroke-width="acceptsDrop ? 3 : strokeWidth"
        :stroke-dasharray="isFrame ? '8 5' : undefined"
        stroke-linejoin="round"
      />
      <path
        v-if="drawn"
        :d="drawn"
        fill="none"
        stroke="currentColor"
        :stroke-width="acceptsDrop ? 3 : strokeWidth"
        stroke-linecap="round"
        data-testid="sketch-outline"
      />
    </svg>

    <!-- End only: dragging from the top of a shape moves it, not a connection. -->
    <Handle
      v-if="!isInk"
      type="target"
      :connectable-start="false"
      :position="Position.Top"
      class="!h-2 !w-2 !border-line !bg-surface"
    />

    <InlineText
      v-if="isEditing && !isInk"
      class="relative"
      :class="isText ? 'text-base font-semibold' : 'text-sm font-semibold'"
      :value="node.name"
      label="Shape title"
      :maxlength="FIELD_LIMIT.TITLE_MAX"
      :caret-at-end="edit?.caretAtEnd.value"
      :take-typed="edit?.caretAtEnd.value ? edit.takeTyped : undefined"
      @save="rename"
      @cancel="edit?.stop()"
    />
    <h3
      v-else-if="!isInk"
      class="relative w-full break-words"
      :class="[titleSize, isTable || isFrame ? 'truncate' : 'line-clamp-2']"
    >
      {{ node.name }}
    </h3>

    <p
      v-if="description && !isInk"
      class="relative w-full leading-snug text-muted"
      :style="{ fontSize: sketch ? '0.875rem' : '0.75rem' }"
      :class="
        isTable ? 'mt-2.5 line-clamp-3' : isDecision ? 'mt-0.5 line-clamp-1' : 'mt-0.5 line-clamp-2'
      "
    >
      {{ description }}
    </p>

    <span
      v-if="notes"
      class="absolute -top-2.5 right-5 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-sm"
      :title="`Notes for the builder: ${notes}`"
      data-testid="node-notes"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M4 4h16v12H8l-4 4Z" />
        <path d="M8 9h8M8 12h5" />
      </svg>
      <span class="sr-only">Has notes for the builder</span>
    </span>

    <Handle
      v-if="!isInk"
      type="source"
      :connectable-end="false"
      :position="Position.Bottom"
      class="!h-2 !w-2 !border-line !bg-surface"
    />
  </div>
</template>
