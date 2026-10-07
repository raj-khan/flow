<script setup>
import BaseModal from '@/components/ui/BaseModal.vue'
import { youtubeEmbed } from '@/domain/youtube.js'

defineProps({ video: { type: String, required: true } })

const emit = defineEmits(['close'])
</script>

<template>
  <BaseModal title="How isketch works" wide @close="emit('close')">
    <div class="aspect-video w-full bg-black">
      <iframe
        class="h-full w-full"
        :src="youtubeEmbed(video)"
        title="How isketch works"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowfullscreen
      />
    </div>
    <p class="px-5 py-3 text-xs text-muted">
      Watch it again any time from <span class="text-ink">Tutorial</span>, top right.
    </p>
  </BaseModal>
</template>
