<script setup>
import BaseModal from '@/components/ui/BaseModal.vue'

/** The open file changed on disk while there are edits here not saved to it. */
defineProps({ name: { type: String, required: true } })
const emit = defineEmits(['theirs', 'mine'])
</script>

<template>
  <BaseModal title="The file changed on disk" @close="emit('mine')">
    <div class="space-y-4 px-5 py-4">
      <p class="text-sm">
        {{ name }} was changed outside isketch, perhaps by an agent, and you have edits here that
        are not saved to it.
      </p>
      <p class="text-xs text-muted">
        Taking the file's version can be undone. Keeping yours leaves the file as it is until you
        save.
      </p>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg border border-line px-3 py-2 text-sm transition-colors hover:bg-hover"
          @click="emit('mine')"
        >
          Keep mine
        </button>
        <button
          type="button"
          class="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-brand-ink transition-opacity hover:opacity-90"
          @click="emit('theirs')"
        >
          Use the file's version
        </button>
      </div>
    </div>
  </BaseModal>
</template>
