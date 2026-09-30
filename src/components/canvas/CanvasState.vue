<script setup>
defineProps({
  isLoading: { type: Boolean, default: false },
  isError: { type: Boolean, default: false },
  message: { type: String, default: '' },
})

defineEmits(['retry'])
</script>

<template>
  <div class="flex h-full w-full items-center justify-center p-8">
    <div v-if="isLoading" class="flex items-center gap-3 text-muted" role="status">
      <span
        class="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-muted"
        aria-hidden="true"
      />
      Loading diagram
    </div>

    <div v-else-if="isError" class="max-w-sm text-center" role="alert">
      <p class="text-sm font-medium">The diagram could not be loaded.</p>
      <p class="mt-1 text-xs text-muted">{{ message }}</p>
      <button
        type="button"
        class="mt-4 rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-hover"
        title="Load the diagram again"
        @click="$emit('retry')"
      >
        Try again
      </button>
    </div>
  </div>
</template>
