<script setup>
import { onBeforeUnmount, onMounted } from 'vue'

import { TOOL, TOOLS, toolForKey } from '@/domain/tools.js'
import { useCanvasStore } from '@/stores/canvas.js'

/**
 * The top-centre island. Number keys and letters pick a tool, as in
 * Excalidraw; Escape goes back to Select and closes the library.
 */
const canvas = useCanvasStore()

/** @param {import('@/domain/tools.js').ToolId} id */
const isOn = (id) => (id === TOOL.SHAPES ? canvas.isLibraryOpen : canvas.tool === id)

/**
 * Keys meant for a field, a menu or a dialog are theirs.
 * @param {KeyboardEvent} event
 */
function isBlocked(event) {
  const target = /** @type {HTMLElement | null} */ (event.target)
  if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return true
  if (target?.isContentEditable || target?.closest?.('[role="menu"]')) return true
  return Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'))
}

/** @param {KeyboardEvent} event */
function onKeydown(event) {
  if (event.ctrlKey || event.metaKey || event.altKey || isBlocked(event)) return

  if (event.key === 'Escape') {
    if (canvas.isLibraryOpen) canvas.closeLibrary()
    else if (canvas.tool !== TOOL.SELECT) canvas.setTool(TOOL.SELECT)
    return
  }

  const tool = toolForKey(event.key)
  if (!tool) return
  event.preventDefault()
  // The pen's own key puts it down again, as it always has.
  canvas.setTool(tool === TOOL.PEN && canvas.pen ? TOOL.SELECT : tool)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="island flex items-center gap-0.5 p-1" role="toolbar" aria-label="Tools">
    <span
      v-for="tool in TOOLS"
      :key="tool.id"
      class="inline-flex"
      :title="`${tool.hint} (${tool.keys.join(' or ')})`"
    >
      <button
        type="button"
        class="relative rounded-lg px-2.5 py-2 text-ink transition-colors hover:bg-hover"
        :class="isOn(tool.id) ? 'bg-focus/15 text-focus' : ''"
        :aria-label="tool.label"
        :aria-pressed="isOn(tool.id) ? 'true' : 'false'"
        :data-tool="tool.id"
        @click="canvas.setTool(tool.id)"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <template v-if="tool.id === 'select'">
            <path d="m5 3 14 7-6 2-3 6Z" />
          </template>
          <template v-else-if="tool.id === 'hand'">
            <path
              d="M8 11V5.5a1.5 1.5 0 0 1 3 0V10m0-5.5a1.5 1.5 0 0 1 3 0V10m0-3.5a1.5 1.5 0 0 1 3 0V13a7 7 0 0 1-7 7h-.5A6.5 6.5 0 0 1 4 15.2l-1-2.7a1.5 1.5 0 0 1 2.6-1.4L8 14"
            />
          </template>
          <template v-else-if="tool.id === 'shapes'">
            <rect x="3" y="3" width="8" height="8" rx="1.5" />
            <circle cx="17" cy="7" r="4" />
            <path d="m7 14 4 7H3Z" />
            <path d="M14 14h7v7h-7z" />
          </template>
          <template v-else-if="tool.id === 'connector'">
            <circle cx="5" cy="19" r="2" />
            <path d="M7 17 19 5M13 5h6v6" />
          </template>
          <template v-else-if="tool.id === 'text'">
            <path d="M5 5h14M12 5v14M9 19h6" />
          </template>
          <template v-else-if="tool.id === 'pen'">
            <path d="M16 3.5a2.1 2.1 0 0 1 3 3L8 17.5l-4 1 1-4Z" />
            <path d="M3 21c3-1 5 1 8 0" />
          </template>
          <template v-else>
            <path d="m7 21-4-4a2 2 0 0 1 0-3l10-10a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3l-8 9" />
            <path d="M7 21h13M9 11l6 6" />
          </template>
        </svg>
        <span
          class="absolute right-0.5 bottom-0 text-[9px] leading-none text-muted"
          aria-hidden="true"
        >
          {{ tool.keys[0] }}
        </span>
      </button>
    </span>
  </div>
</template>
