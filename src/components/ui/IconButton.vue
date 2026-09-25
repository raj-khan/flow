<script setup>
/**
 * The title sits on the wrapper: Chrome and Safari show none on a disabled
 * button, which is exactly when "Nothing to undo" needs reading.
 */
defineProps({
  label: { type: String, required: true },
  title: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  /** For a toggle; left null, the button is a plain action. */
  pressed: { type: /** @type {import('vue').PropType<boolean | null>} */ (Boolean), default: null },
  /** Bare inside an island, which already draws the border. */
  variant: { type: String, default: 'outlined' },
})
</script>

<template>
  <span class="inline-flex" :title="title || label">
    <button
      type="button"
      class="rounded-lg px-2.5 py-2 text-sm text-ink transition-colors hover:bg-hover disabled:opacity-30"
      :class="[
        variant === 'bare' ? '' : 'border border-line bg-surface',
        pressed ? 'bg-hover' : '',
      ]"
      :disabled="disabled"
      :aria-label="label"
      :aria-pressed="pressed === null ? undefined : pressed ? 'true' : 'false'"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <slot />
      </svg>
    </button>
  </span>
</template>
