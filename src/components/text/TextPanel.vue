<script setup>
import { computed, ref, useId, useTemplateRef } from 'vue'

import { useDiagramText } from '@/composables/useDiagramText.js'
import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { toMermaid } from '@/domain/mermaid.js'
import { useCanvasStore } from '@/stores/canvas.js'

/** The diagram as `.flow` text, floating over the canvas. Either side can be edited. */
const { text, errors, input, focus, blur } = useDiagramText()

const editor = useTemplateRef('editor')
const errorsId = useId()
const { document } = useFlowQuery()
const canvas = useCanvasStore()
/** Which copy button last worked, so only that one says so. */
const copied = ref('')

const status = computed(() => {
  if (errors.value.length === 1) return '1 problem. The canvas shows the last valid diagram.'
  if (errors.value.length) {
    return `${errors.value.length} problems. The canvas shows the last valid diagram.`
  }
  return 'Edits apply as you type.'
})

/** Put the caret on a reported line, so the problem is one click away. */
/** @param {number} line */
function goToLine(line) {
  const area = editor.value
  if (!area) return

  const lines = area.value.split('\n')
  const start = lines.slice(0, line - 1).reduce((sum, row) => sum + row.length + 1, 0)
  area.focus()
  area.setSelectionRange(start, start + (lines[line - 1]?.length ?? 0))
}

/** @param {'flow' | 'mermaid'} format */
async function copy(format) {
  try {
    await navigator.clipboard.writeText(format === 'flow' ? text.value : toMermaid(document.value))
    copied.value = format
    setTimeout(() => (copied.value = ''), 1500)
  } catch {
    // Clipboard access can be refused; the text is still there to select.
  }
}
</script>

<template>
  <aside
    class="island flex h-full w-[360px] max-w-full flex-col overflow-hidden"
    aria-label="Diagram as text"
  >
    <header class="space-y-2 px-4 pt-4 pb-2">
      <div class="flex items-start gap-2">
        <div class="min-w-0 flex-1">
          <h2 class="text-xs font-semibold tracking-wide text-muted uppercase">Text</h2>
          <p class="text-xs text-muted" role="status">{{ status }}</p>
        </div>
        <button
          type="button"
          class="rounded-md p-1 text-muted hover:bg-hover"
          aria-label="Close text"
          title="Close the text pane"
          @click="canvas.toggleText"
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
      </div>

      <div class="flex flex-wrap gap-1.5">
        <button
          type="button"
          class="rounded-lg border border-line px-2.5 py-1 text-xs transition-colors hover:bg-hover"
          title="Copy the diagram as .flow text"
          @click="copy('flow')"
        >
          {{ copied === 'flow' ? 'Copied' : 'Copy' }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-line px-2.5 py-1 text-xs transition-colors hover:bg-hover"
          title="Copy the diagram as a Mermaid flowchart, for a README or a wiki"
          @click="copy('mermaid')"
        >
          {{ copied === 'mermaid' ? 'Copied' : 'Copy as Mermaid' }}
        </button>
      </div>
    </header>

    <textarea
      ref="editor"
      :value="text"
      class="min-h-0 flex-1 resize-none border-y border-line bg-sunken px-4 py-3 font-mono text-xs leading-relaxed text-ink outline-none focus:border-line-strong"
      :class="errors.length ? 'border-danger' : ''"
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
      wrap="off"
      aria-label="Diagram as .flow text"
      :aria-invalid="errors.length ? 'true' : undefined"
      :aria-describedby="errors.length ? errorsId : undefined"
      @input="input(/** @type {HTMLTextAreaElement} */ ($event.target).value)"
      @focus="focus"
      @blur="blur"
    />

    <ul
      v-if="errors.length"
      :id="errorsId"
      class="scroll-panel max-h-40 space-y-1 px-4 py-3"
      role="alert"
    >
      <li v-for="error in errors" :key="`${error.line}-${error.message}`">
        <button
          type="button"
          class="w-full text-left text-xs text-danger hover:underline"
          :title="`Go to line ${error.line}`"
          @click="goToLine(error.line)"
        >
          Line {{ error.line }}: {{ error.message }}
        </button>
      </li>
    </ul>
  </aside>
</template>
