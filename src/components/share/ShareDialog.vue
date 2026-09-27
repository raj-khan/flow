<script setup>
import { computed, ref } from 'vue'

import BaseModal from '@/components/ui/BaseModal.vue'
import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { usePublish } from '@/composables/usePublish.js'
import { useShareLink } from '@/composables/useShareLink.js'
import { useToastStore } from '@/stores/toasts.js'

/**
 * Two ways to share, honest about the difference: a private link that
 * carries the diagram and uploads nothing, and a public link an AI can read,
 * which needs an isketch server.
 */
const emit = defineEmits(['close'])

const { share } = useShareLink()
const { link, isAvailable, isBusy, error, publish, unpublish } = usePublish()
const toasts = useToastStore()
const copied = ref('')
const { document } = useFlowQuery()

/**
 * The published diagram, placed elsewhere: an image for a README that shows
 * the latest version, and an iframe for Notion, Medium or a docs site.
 */
const embeds = computed(() => {
  if (!link.value) return null
  const url = link.value.url
  const title = (document.value?.title || 'Diagram').replace(/[[\]"]/g, '')
  return {
    readme: `[![${title}](${url}.svg)](${url})`,
    iframe: `<iframe src="${url}/embed" width="800" height="500" style="border:0;max-width:100%" loading="lazy" title="${title}"></iframe>`,
  }
})

/** @param {string} text @param {string} which */
async function copy(text, which) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = which
    setTimeout(() => (copied.value = ''), 1500)
  } catch {
    toasts.push('The link could not be copied. Your browser refused the clipboard.', {
      tone: 'danger',
    })
  }
}

async function copyPrivate() {
  await share()
  emit('close')
}

const button =
  'rounded-lg border border-line px-3 py-1.5 text-sm transition-colors hover:bg-hover disabled:opacity-40'
</script>

<template>
  <BaseModal title="Share" @close="emit('close')">
    <div class="space-y-5 px-5 py-4">
      <section class="space-y-2">
        <h3 class="text-sm font-semibold">Private link</h3>
        <p class="text-xs text-muted">
          The whole diagram travels inside the link, so nothing is uploaded. People who open it get
          their own copy. AI tools that fetch links cannot read it: browsers never send that part of
          a link to a server.
        </p>
        <button type="button" :class="button" @click="copyPrivate">Copy private link</button>
      </section>

      <section class="space-y-2 border-t border-line pt-4">
        <h3 class="text-sm font-semibold">Public link for AI agents</h3>

        <template v-if="!isAvailable">
          <p class="text-xs text-muted">
            A link Claude, ChatGPT or any agent can open and read needs an isketch server to hold
            the diagram. This copy of the app is not connected to one. The server is in
            <code>server/</code>; see the README to run it.
          </p>
        </template>

        <template v-else>
          <p class="text-xs text-muted">
            Stores the diagram on the server. Anyone with the link can read it: the page carries the
            brief as text, and <code>.md</code> gives an agent just the brief. Publishing again
            updates the same link.
          </p>

          <div v-if="link" class="space-y-2">
            <div class="flex items-center gap-2">
              <input
                :value="link.url"
                readonly
                aria-label="Public link"
                class="min-w-0 flex-1 rounded-lg border border-line bg-sunken px-3 py-1.5 text-sm"
                @focus="/** @type {HTMLInputElement} */ ($event.target).select()"
              />
              <button type="button" :class="button" @click="copy(link.url, 'url')">
                {{ copied === 'url' ? 'Copied' : 'Copy' }}
              </button>
            </div>
            <div class="flex flex-wrap gap-2">
              <button type="button" :class="button" @click="copy(link.markdown, 'md')">
                {{ copied === 'md' ? 'Copied' : 'Copy brief link (.md)' }}
              </button>
              <button
                v-if="embeds"
                type="button"
                :class="button"
                title="A picture of the diagram for a README, linked to it; it shows each new version"
                @click="copy(embeds.readme, 'readme')"
              >
                {{ copied === 'readme' ? 'Copied' : 'Copy README image' }}
              </button>
              <button
                v-if="embeds"
                type="button"
                :class="button"
                title="An iframe for docs sites; Notion and Medium embed the plain link"
                @click="copy(embeds.iframe, 'iframe')"
              >
                {{ copied === 'iframe' ? 'Copied' : 'Copy embed code' }}
              </button>
              <button type="button" :class="button" :disabled="isBusy" @click="publish">
                Update with this version
              </button>
              <button
                type="button"
                :class="[button, 'text-danger']"
                :disabled="isBusy"
                @click="unpublish"
              >
                Unpublish
              </button>
            </div>
          </div>

          <button
            v-else
            type="button"
            class="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-brand-ink disabled:opacity-40"
            :disabled="isBusy"
            @click="publish"
          >
            {{ isBusy ? 'Publishing' : 'Publish a public link' }}
          </button>

          <p v-if="error" class="text-xs text-danger" role="alert">{{ error }}</p>
        </template>
      </section>
    </div>
  </BaseModal>
</template>
