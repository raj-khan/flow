<script setup>
import { COLOR_NAMES } from '@/domain/colors.js'

/** The palette as a row of swatches, with Default first: the kind's own look, or ink. */
defineProps({
  /** The chosen colour; empty for Default, null when a selection mixes colours. */
  value: { type: /** @type {import('vue').PropType<string | null>} */ (String), default: '' },
  label: { type: String, required: true },
  /** What picking a colour does, for its tooltip: "Colour the selection". */
  action: { type: String, required: true },
  /** What Default means here, for its tooltip. */
  plain: { type: String, required: true },
})
const emit = defineEmits(['pick'])

/** @param {string} name */
const title = (name) => (name ? name[0].toUpperCase() + name.slice(1) : 'Default')
</script>

<template>
  <div role="radiogroup" :aria-label="label" class="flex items-center gap-0.5">
    <button
      v-for="name in ['', ...COLOR_NAMES]"
      :key="name || 'default'"
      type="button"
      role="radio"
      :aria-checked="value === name"
      :aria-label="title(name)"
      :title="name ? `${action} ${name}` : plain"
      class="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-hover aria-checked:bg-hover"
      @click="emit('pick', name)"
    >
      <span
        class="block h-4 w-4 rounded-full border"
        :class="[
          name ? '' : 'border-line-strong bg-surface',
          value === name ? 'ring-2 ring-focus ring-offset-1 ring-offset-surface' : '',
        ]"
        :style="
          name
            ? { background: `var(--paint-${name}-soft)`, borderColor: `var(--paint-${name})` }
            : undefined
        "
      />
    </button>
  </div>
</template>
