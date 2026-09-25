<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

import { useDiagramFile } from '@/composables/useDiagramFile.js'
import { useFlowHistory } from '@/composables/useFlowHistory.js'
import { usePlatform } from '@/composables/usePlatform.js'
import { useSketchStyle } from '@/composables/useSketchStyle.js'
import { useStartDiagram } from '@/composables/useStartDiagram.js'
import { useTheme } from '@/composables/useTheme.js'
import { COMBO, comboLabel } from '@/domain/shortcuts.js'
import { useCanvasStore } from '@/stores/canvas.js'
import { useFileStore } from '@/stores/file.js'
import { useToastStore } from '@/stores/toasts.js'

/**
 * The top-left island: the product, the open file, and a menu of everything
 * that is not drawing. It owns Ctrl+O and Ctrl+S, bound once here.
 */
const emit = defineEmits(['help', 'import', 'compare', 'export'])

const canvas = useCanvasStore()
const file = useFileStore()
const toasts = useToastStore()
const { undo } = useFlowHistory()
const { open, save } = useDiagramFile({ bindKeys: true })
const { start, isPending: isStarting } = useStartDiagram()
const { sketch, toggle: toggleSketch } = useSketchStyle()
const { label: themeLabel, cycle: cycleTheme } = useTheme()
const { isMac } = usePlatform()

const isOpen = ref(false)
const trigger = useTemplateRef('trigger')
const list = useTemplateRef('list')

function startEmpty() {
  start(undefined, {
    onSuccess: () => toasts.push('Started a new diagram', { action: { label: 'Undo', run: undo } }),
  })
}

/**
 * @typedef {{ label: string, run: () => void, hint?: string, checked?: boolean, disabled?: boolean }} Item
 */
const groups = computed(
  () =>
    /** @type {Item[][]} */ ([
      [
        { label: 'New diagram', run: startEmpty, disabled: isStarting.value },
        { label: 'Open file', run: open, hint: comboLabel(COMBO.OPEN, isMac.value) },
        { label: 'Save', run: save, hint: comboLabel(COMBO.SAVE, isMac.value) },
      ],
      [
        { label: 'Import', run: () => emit('import') },
        { label: 'Export', run: () => emit('export') },
        { label: 'Compare', run: () => emit('compare') },
      ],
      [
        { label: 'Edit as text', run: canvas.toggleText, checked: canvas.isTextOpen },
        { label: 'Sketch style', run: toggleSketch, checked: sketch.value },
        { label: themeLabel.value, run: cycleTheme },
      ],
      [
        {
          label: 'Keyboard shortcuts',
          run: () => emit('help'),
          hint: comboLabel(COMBO.HELP, isMac.value),
        },
      ],
    ]),
)

/** @param {HTMLElement | null} [element] */
const items = (element = list.value) =>
  [...(element?.querySelectorAll('[role^="menuitem"]:not(:disabled)') ?? [])].map(
    (item) => /** @type {HTMLElement} */ (item),
  )

async function show() {
  isOpen.value = true
  await nextTick()
  items()[0]?.focus()
}

function hide({ refocus = true } = {}) {
  if (!isOpen.value) return
  isOpen.value = false
  if (refocus) trigger.value?.focus()
}

/** @param {Item} item */
function choose(item) {
  // The theme cycles in place; everything else is done with the menu.
  if (item.label !== themeLabel.value) hide()
  item.run()
}

/** @param {KeyboardEvent} event */
function onMenuKey(event) {
  const all = items()
  const at = all.indexOf(/** @type {HTMLElement} */ (document.activeElement))
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    const step = event.key === 'ArrowDown' ? 1 : -1
    all[(at + step + all.length) % all.length]?.focus()
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault()
    ;(event.key === 'Home' ? all[0] : all.at(-1))?.focus()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    hide()
  } else if (event.key === 'Tab') {
    hide({ refocus: false })
  }
}

/** @param {PointerEvent} event */
function onOutside(event) {
  const target = /** @type {Node} */ (event.target)
  if (!list.value?.contains(target) && !trigger.value?.contains(target)) hide({ refocus: false })
}

onMounted(() => window.addEventListener('pointerdown', onOutside))
onBeforeUnmount(() => window.removeEventListener('pointerdown', onOutside))
</script>

<template>
  <div class="island relative flex items-center gap-2 p-1 pr-3">
    <button
      ref="trigger"
      type="button"
      class="rounded-lg px-2.5 py-2 text-ink transition-colors hover:bg-hover"
      :class="isOpen ? 'bg-hover' : ''"
      aria-label="Menu"
      aria-haspopup="menu"
      :aria-expanded="isOpen ? 'true' : 'false'"
      title="Menu: file, import, export, view and help"
      @click="isOpen ? hide() : show()"
      @keydown.down.prevent="show"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    <h1 class="max-w-[40vw] truncate text-sm font-semibold">
      isketch<span v-if="file.name" class="font-normal text-muted"> · {{ file.name }}</span>
    </h1>

    <div
      v-if="isOpen"
      ref="list"
      role="menu"
      aria-label="Menu"
      class="island absolute top-full left-0 z-30 mt-2 w-64 p-1.5"
      @keydown="onMenuKey"
    >
      <template v-for="(group, index) in groups" :key="index">
        <div v-if="index" class="my-1 border-t border-line" role="separator" />
        <button
          v-for="item in group"
          :key="item.label"
          type="button"
          :role="item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'"
          :aria-checked="item.checked === undefined ? undefined : item.checked ? 'true' : 'false'"
          :disabled="item.disabled"
          class="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-ink transition-colors hover:bg-hover focus:bg-hover focus:outline-none disabled:opacity-40"
          @click="choose(item)"
        >
          <span class="w-4 text-xs" aria-hidden="true">{{ item.checked ? '✓' : '' }}</span>
          <span class="flex-1">{{ item.label }}</span>
          <kbd v-if="item.hint" class="text-xs text-muted">{{ item.hint }}</kbd>
        </button>
      </template>
    </div>
  </div>
</template>
