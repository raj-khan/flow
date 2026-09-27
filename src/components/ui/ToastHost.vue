<script setup>
import { useToastStore } from '@/stores/toasts.js'

const toasts = useToastStore()

/** Written out, since Tailwind only scans for complete class strings. */
const TONE = Object.freeze({
  success: { bar: 'bg-node-message', icon: 'text-node-message' },
  danger: { bar: 'bg-danger', icon: 'text-danger' },
})

/** @param {{ id: number, action?: { run: () => void } }} toast */
function run(toast) {
  toast.action?.run()
  toasts.dismiss(toast.id)
}
</script>

<template>
  <Teleport to="body">
    <!-- Polite, not assertive: a confirmation should not interrupt a screen reader. -->
    <div
      class="pointer-events-none fixed inset-x-0 bottom-4 z-50 max-md:bottom-36 flex flex-col items-center gap-2 px-4"
      role="status"
      aria-live="polite"
    >
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts.toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-center gap-3 overflow-hidden rounded-lg border border-line bg-surface py-2 pr-3 pl-0 text-sm text-ink shadow-lg"
        >
          <span
            class="h-8 w-1 shrink-0 rounded-r"
            :class="TONE[toast.tone].bar"
            aria-hidden="true"
          />

          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="shrink-0"
            :class="TONE[toast.tone].icon"
            aria-hidden="true"
          >
            <path v-if="toast.tone === 'success'" d="m4.5 12.5 5 5 10-11" />
            <path
              v-else
              d="M12 7v6M12 17h.01M10.3 3.9 2.6 17.4A1.8 1.8 0 0 0 4.2 20h15.6a1.8 1.8 0 0 0 1.6-2.6L13.7 3.9a1.9 1.9 0 0 0-3.4 0Z"
            />
          </svg>

          <span>{{ toast.message }}</span>

          <button
            v-if="toast.action"
            type="button"
            class="text-xs font-medium text-focus hover:underline"
            :title="`${toast.action.label} this change`"
            @click="run(toast)"
          >
            {{ toast.action.label }}
          </button>

          <button
            type="button"
            class="rounded-md p-0.5 text-muted hover:bg-hover"
            aria-label="Dismiss"
            title="Dismiss this message"
            @click="toasts.dismiss(toast.id)"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity var(--fast) var(--ease),
    transform var(--slow) var(--ease);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
