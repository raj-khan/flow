<script setup>
import { computed, ref, watchEffect } from 'vue'

import { track } from '@/api/analytics.js'
import BaseModal from '@/components/ui/BaseModal.vue'
import { downloadBlob, downloadText } from '@/composables/download.js'
import { sketchFontData, svgToPng } from '@/composables/exportImage.js'
import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { toDrawio } from '@/domain/drawio.js'
import { flowFileName } from '@/domain/flowText.js'
import { renderSvg } from '@/domain/renderSvg.js'
import { isSketch } from '@/domain/sketch.js'
import { useThemeStore } from '@/stores/theme.js'
import { useToastStore } from '@/stores/toasts.js'

/** The diagram as a picture, or as a file for draw.io. `.flow` is Save. */
const emit = defineEmits(['close'])

const { document } = useFlowQuery()
const theme = useThemeStore()
const toasts = useToastStore()

const FORMATS = [
  { id: 'png', label: 'PNG', hint: 'An image for slides, docs and chat' },
  { id: 'svg', label: 'SVG', hint: 'Sharp at any size, for docs and the web' },
  { id: 'drawio', label: 'draw.io', hint: 'To carry on in draw.io or diagrams.net' },
]

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
        <div class="grid grid-cols-3 gap-2">
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

      <fieldset v-if="format !== 'drawio'" class="flex items-center gap-4 text-sm">
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
        v-if="format !== 'drawio'"
        :src="preview"
        alt="What the export will look like"
        class="max-h-[45vh] w-full rounded-lg border border-line object-contain"
      />
      <p v-else class="text-xs text-muted">
        Opens in draw.io as it is, positions, sizes and sketch style included, and comes back into
        isketch unchanged through Import.
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
