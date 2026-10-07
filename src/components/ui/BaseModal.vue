<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Hand rolled: a UI library would be a large dependency for one dialog. */
defineProps({
  title: { type: String, required: true },
  /** Room for a video rather than a form. */
  wide: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

/** @type {import('vue').Ref<HTMLElement | null>} */
const panel = ref(null)
/** @type {import('vue').Ref<HTMLElement | null>} */
const content = ref(null)
/** @type {import('vue').Ref<HTMLElement | null>} */
const previouslyFocused = ref(null)

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

/** @param {HTMLElement | null} root @returns {HTMLElement[]} */
const focusablesIn = (root) =>
  Array.from(/** @type {NodeListOf<HTMLElement>} */ (root?.querySelectorAll(FOCUSABLE) ?? []))

const focusables = () => focusablesIn(panel.value)

/** Keeping Tab inside is what makes it a modal rather than a box. */
/** @param {KeyboardEvent} event */
function onKeydown(event) {
  if (event.key === 'Escape') {
    emit('close')
    return
  }

  if (event.key !== 'Tab') return

  const items = focusables()
  if (!items.length) return

  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement

  if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  previouslyFocused.value = /** @type {HTMLElement | null} */ (document.activeElement)
  window.addEventListener('keydown', onKeydown)
  // Open on the first field, not the close button: the point is to fill it in.
  const target = focusablesIn(content.value)[0] ?? focusables()[0]
  target?.focus()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  previouslyFocused.value?.focus()
})
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 max-md:items-end max-md:p-0"
    >
      <div
        data-testid="modal-backdrop"
        class="absolute inset-0 bg-brand/30"
        @click="emit('close')"
      />

      <div
        ref="panel"
        class="relative w-full rounded-xl border border-line bg-surface shadow-xl max-md:max-h-[90vh] max-md:max-w-none max-md:overflow-y-auto max-md:rounded-b-none"
        :class="wide ? 'max-w-3xl' : 'max-w-md'"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <header class="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 class="text-sm font-semibold">{{ title }}</h2>
          <button
            type="button"
            class="rounded-md p-1 text-muted hover:bg-hover"
            aria-label="Close dialog"
            title="Close (Esc)"
            @click="emit('close')"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div ref="content">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
