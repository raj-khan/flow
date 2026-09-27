<script setup>
import { computed, onBeforeUnmount, ref, watchEffect } from 'vue'

import { track } from '@/api/analytics.js'
import BaseModal from '@/components/ui/BaseModal.vue'
import { downloadBlob, downloadText } from '@/composables/download.js'
import { sketchFontData, svgToPng } from '@/composables/exportImage.js'
import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { toDrawio } from '@/domain/drawio.js'
import { toExcalidraw } from '@/domain/excalidraw.js'
import { flowFileName } from '@/domain/flowText.js'
import { frameDocument, isFrame } from '@/domain/frames.js'
import { renderSvg } from '@/domain/renderSvg.js'
import { isSketch } from '@/domain/sketch.js'
import { useCanvasStore } from '@/stores/canvas.js'
import { useThemeStore } from '@/stores/theme.js'
import { useToastStore } from '@/stores/toasts.js'

/** The diagram, or one frame of it, as a picture or a file for draw.io. `.flow` is Save. */
const emit = defineEmits(['close'])

const { document: whole } = useFlowQuery()
const canvas = useCanvasStore()

/** The frames there are to export on their own, and which one, if any, is chosen. */
const frames = computed(() => (whole.value?.nodes ?? []).filter(isFrame))
const area = ref(canvas.exportFrame)
onBeforeUnmount(() => (canvas.exportFrame = ''))

/** What is exported: the whole diagram, or the chosen frame and what it holds. */
const document = computed(() =>
  whole.value && area.value ? (frameDocument(whole.value, area.value) ?? whole.value) : whole.value,
)
const theme = useThemeStore()
const toasts = useToastStore()

const FORMATS = [
  { id: 'png', label: 'PNG', hint: 'An image for slides, docs and chat' },
  { id: 'svg', label: 'SVG', hint: 'Sharp at any size, for docs and the web' },
  { id: 'drawio', label: 'draw.io', hint: 'To carry on in draw.io or diagrams.net' },
  { id: 'excalidraw', label: 'Excalidraw', hint: 'To carry on sketching in Excalidraw' },
]
/** Files, not pictures: no colours to pick and no preview to show. */
const isFile = computed(() => format.value === 'drawio' || format.value === 'excalidraw')

const format = ref('png')
const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
const look = ref(
  theme.preference === 'dark' || (theme.preference === 'system' && systemDark) ? 'dark' : 'light',
)

/** A sketch waits for its font, so the picture looks the way it downloads. */
const font = ref('')
watchEffect(async () => {
  if (isSketch(document.value) && !font.value) font.value = await sketchFontData()
})

const svg = computed(() =>
  document.value
    ? renderSvg(document.value, {
        theme: look.value === 'dark' ? 'dark' : 'light',
        sketchFont: font.value,
      })
    : '',
)
const preview = computed(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.value)}`)
const baseName = computed(() => flowFileName(document.value?.title ?? '').replace(/\.flow$/, ''))
const isBusy = ref(false)

async function download() {
  if (!document.value) return
  const name = `${baseName.value}.${format.value}`
  try {
    isBusy.value = true
    if (format.value === 'svg') downloadText(name, svg.value, 'image/svg+xml')
    else if (format.value === 'drawio') {
      downloadText(name, toDrawio(document.value), 'application/xml')
    } else if (format.value === 'excalidraw') {
      downloadText(name, toExcalidraw(document.value), 'application/json')
    } else downloadBlob(name, await svgToPng(svg.value))
    track('exported', { format: format.value })
    toasts.push(`Downloaded ${name}`)
    emit('close')
  } catch {
    toasts.push('The image could not be made. Try SVG instead.', { tone: 'danger' })
  } finally {
    isBusy.value = false
  }
}
</script>

<template>
  <BaseModal title="Export" @close="emit('close')">
    <div class="space-y-4 px-5 py-4">
      <fieldset>
        <legend class="mb-1.5 text-xs font-medium text-muted">Format</legend>
        <div class="grid grid-cols-2 gap-2 md:grid-cols-4">
          <label
            v-for="option in FORMATS"
            :key="option.id"
            class="cursor-pointer rounded-lg border px-3 py-2 text-sm transition-colors focus-within:ring-2 focus-within:ring-focus"
            :class="format === option.id ? 'border-focus bg-hover' : 'border-line hover:bg-hover'"
            :title="option.hint"
          >
            <input v-model="format" type="radio" name="format" :value="option.id" class="sr-only" />
            <span class="block font-medium">{{ option.label }}</span>
            <span class="block text-xs text-muted">{{ option.hint }}</span>
          </label>
        </div>
      </fieldset>

      <label v-if="frames.length" class="block text-sm">
        <span class="mb-1.5 block text-xs font-medium text-muted">What to export</span>
        <select
          v-model="area"
          class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
        >
          <option value="">The whole diagram</option>
          <option v-for="frame in frames" :key="frame.id" :value="frame.id">
            Frame: {{ frame.name || frame.id }}
          </option>
        </select>
      </label>

      <fieldset v-if="!isFile" class="flex items-center gap-4 text-sm">
        <legend class="sr-only">Colours</legend>
        <label class="flex items-center gap-1.5">
          <input v-model="look" type="radio" name="look" value="light" />
          Light
        </label>
        <label class="flex items-center gap-1.5">
          <input v-model="look" type="radio" name="look" value="dark" />
          Dark
        </label>
      </fieldset>

      <img
        v-if="!isFile"
        :src="preview"
        alt="What the export will look like"
        class="max-h-[45vh] w-full rounded-lg border border-line object-contain"
      />
      <p v-else-if="format === 'drawio'" class="text-xs text-muted">
        Opens in draw.io as it is, positions, sizes and sketch style included, and comes back into
        isketch unchanged through Import.
      </p>
      <p v-else class="text-xs text-muted">
        Opens in Excalidraw with its shapes, labels and bound arrows, and comes back into isketch
        unchanged through Import: each shape keeps its kind, description and notes.
      </p>

      <div class="flex justify-end">
        <button
          type="button"
          class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-ink transition-opacity hover:opacity-90 disabled:opacity-40"
          :disabled="isBusy || !document"
          @click="download"
        >
          Download {{ baseName }}.{{ format }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>
