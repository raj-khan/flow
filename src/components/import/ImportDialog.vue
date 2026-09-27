<script setup>
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'

import BaseModal from '@/components/ui/BaseModal.vue'
import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { useReplaceDocument } from '@/composables/useNodeMutations.js'
import { useFlowHistory } from '@/composables/useFlowHistory.js'
import { IMPORT_FORMATS } from '@/domain/importers.js'
import { mergeImport } from '@/domain/mergeImport.js'
import { ROUTE } from '@/router/index.js'
import { useCanvasStore } from '@/stores/canvas.js'
import { useFileStore } from '@/stores/file.js'
import { useToastStore } from '@/stores/toasts.js'

/**
 * Paste or open a file, see what will come in and what will not, then import:
 * as a new diagram, or, for a format that can, as an update that keeps the
 * layout of the one on screen.
 */
const emit = defineEmits(['close'])

const router = useRouter()
const canvas = useCanvasStore()
const file = useFileStore()
const toasts = useToastStore()
const { document: current } = useFlowQuery()
const { undo } = useFlowHistory()

const formatId = ref(IMPORT_FORMATS[0].id)
const format = computed(
  () => IMPORT_FORMATS.find((candidate) => candidate.id === formatId.value) ?? IMPORT_FORMATS[0],
)
const replace = useReplaceDocument('Import')

const source = ref('')
const fileInput = useTemplateRef('fileInput')
const result = computed(() => (source.value.trim() ? format.value.read(source.value) : null))
const imported = computed(() => result.value?.document ?? null)
const shapeCount = computed(() => imported.value?.nodes.length ?? 0)

/** Update is offered once there is something to update, and chosen when this format made it. */
const canUpdate = computed(() => Boolean(format.value.origin) && current.value.nodes.length > 0)
const mode = ref(/** @type {'replace' | 'update'} */ ('replace'))
watch(
  [formatId, () => current.value.nodes.length],
  () => {
    const madeHere = current.value.nodes.some((node) => node.data?.origin === format.value.origin)
    mode.value = canUpdate.value && madeHere ? 'update' : 'replace'
  },
  { immediate: true },
)

/** @param {number} count @param {string} one */
const plural = (count, one) => `${count} ${one}${count === 1 ? '' : 's'}`

const summary = computed(() => {
  if (!result.value) return `Paste ${format.value.label}, or open a file, to see what will come in.`
  if (!imported.value || !shapeCount.value) return 'Nothing to import yet.'
  const { edges } = imported.value
  const effect =
    mode.value === 'update'
      ? 'This updates the current diagram and keeps its layout'
      : 'This replaces the current diagram'
  return `${plural(shapeCount.value, 'shape')} and ${plural(edges.length, 'connection')}. ${effect}; undo brings it back.`
})

async function openFile(/** @type {Event} */ event) {
  const file = /** @type {HTMLInputElement} */ (event.target).files?.[0]
  if (file) source.value = await file.text()
}

function submit() {
  if (!imported.value || !shapeCount.value) return
  const origin = format.value.origin
  const next =
    mode.value === 'update' && origin
      ? mergeImport(current.value, imported.value, origin)
      : imported.value
  const count = shapeCount.value

  router.push({ name: ROUTE.FLOW })
  if (mode.value === 'replace') {
    canvas.forgetViewport()
    file.forget()
  }
  replace.mutate(next, {
    onSuccess: () =>
      toasts.push(`Imported ${plural(count, 'shape')}`, { action: { label: 'Undo', run: undo } }),
  })
  emit('close')
}
</script>

<template>
  <BaseModal title="Import" @close="emit('close')">
    <form class="space-y-3 px-5 py-4" @submit.prevent="submit">
      <div class="flex gap-1 rounded-lg bg-sunken p-1" role="radiogroup" aria-label="Format">
        <button
          v-for="option in IMPORT_FORMATS"
          :key="option.id"
          type="button"
          role="radio"
          :aria-checked="option.id === formatId ? 'true' : 'false'"
          class="flex-1 rounded-md px-3 py-1.5 text-sm transition-colors"
          :class="
            option.id === formatId
              ? 'bg-surface font-medium shadow-sm'
              : 'text-muted hover:text-ink'
          "
          :title="`Import a ${option.label} file`"
          @click="formatId = option.id"
        >
          {{ option.label }}
        </button>
      </div>

      <label class="block">
        <span class="mb-1 flex items-center justify-between text-xs font-medium text-muted">
          {{ format.label }}
          <button
            type="button"
            class="rounded-md border border-line px-2 py-0.5 text-xs text-ink hover:bg-hover"
            :title="`Open a ${format.label} file from this computer`"
            @click="fileInput?.click()"
          >
            Open file
          </button>
        </span>
        <textarea
          v-model="source"
          rows="10"
          spellcheck="false"
          class="w-full resize-y rounded-lg border border-line bg-sunken px-3 py-2 font-mono text-xs text-ink outline-none focus:border-line-strong"
          :placeholder="format.placeholder"
          :aria-label="`${format.label} to import`"
        />
      </label>
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        :accept="format.accept"
        tabindex="-1"
        @change="openFile"
      />

      <fieldset v-if="canUpdate" class="space-y-1 text-sm">
        <legend class="mb-1 text-xs font-medium text-muted">Into</legend>
        <label class="flex items-center gap-2">
          <input v-model="mode" type="radio" value="update" />
          The current diagram, keeping its layout and anything added by hand
        </label>
        <label class="flex items-center gap-2">
          <input v-model="mode" type="radio" value="replace" />
          A new diagram
        </label>
      </fieldset>

      <p class="text-xs text-muted" role="status">{{ summary }}</p>

      <ul
        v-if="result?.warnings.length"
        class="scroll-panel max-h-32 space-y-0.5 text-xs text-muted"
        aria-label="What will be skipped"
      >
        <li v-for="warning in result.warnings" :key="`${warning.line}-${warning.message}`">
          {{ warning.line ? `Line ${warning.line}: ` : '' }}{{ warning.message }}
        </li>
      </ul>

      <div class="flex justify-end gap-2 pt-1">
        <button
          type="button"
          class="rounded-lg border border-line px-3 py-2 text-sm transition-colors hover:bg-hover"
          title="Close without importing (Esc)"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-hover disabled:opacity-40"
          title="Import into the diagram. Undo brings back what was there"
          :disabled="!shapeCount"
        >
          Import
        </button>
      </div>
    </form>
  </BaseModal>
</template>
