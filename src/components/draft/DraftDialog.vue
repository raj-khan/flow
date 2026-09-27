<script setup>
import { computed, ref } from 'vue'

import BaseModal from '@/components/ui/BaseModal.vue'
import { useFlowHistory } from '@/composables/useFlowHistory.js'
import { useReplaceDocument } from '@/composables/useNodeMutations.js'
import { AGENT_LINKS, draftPrompt, readDraft } from '@/domain/draft.js'
import { useCanvasStore } from '@/stores/canvas.js'
import { useFileStore } from '@/stores/file.js'
import { useToastStore } from '@/stores/toasts.js'

/**
 * A diagram from words, drafted by the agent the person already uses: describe
 * it, take the prompt to the agent, paste the answer back. Nothing is sent
 * anywhere by isketch.
 */
const emit = defineEmits(['close'])

const description = ref('')
const answer = ref('')
const copied = ref(false)
const toasts = useToastStore()
const canvas = useCanvasStore()
const file = useFileStore()
const replace = useReplaceDocument('Draft from words')
const { undo } = useFlowHistory()

const prompt = computed(() => (description.value.trim() ? draftPrompt(description.value) : ''))
const draft = computed(() => (answer.value.trim() ? readDraft(answer.value) : null))
const status = computed(() => {
  if (!draft.value) return 'Paste the agent’s answer here; talk around the diagram is fine.'
  const { document, errors } = draft.value
  if (!document) return `Line ${errors[0].line}: ${errors[0].message}`
  const shapes = document.nodes.length
  const lines = document.edges.length
  return `${shapes} shape${shapes === 1 ? '' : 's'} and ${lines} connection${lines === 1 ? '' : 's'}, ready.`
})

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(prompt.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    toasts.push('The prompt could not be copied. Your browser refused the clipboard.', {
      tone: 'danger',
    })
  }
}

function use() {
  const document = draft.value?.document
  if (!document) return
  canvas.forgetViewport()
  file.forget()
  replace.mutate(document, {
    onSuccess: () =>
      toasts.push('Drawn from the agent’s answer. Undo brings yours back.', {
        action: { label: 'Undo', run: undo },
      }),
  })
  emit('close')
}

const button =
  'rounded-lg border border-line px-3 py-1.5 text-sm transition-colors hover:bg-hover aria-disabled:pointer-events-none aria-disabled:opacity-40'
const field =
  'w-full resize-y rounded-lg border border-line bg-sunken px-3 py-2 text-sm text-ink outline-none focus:border-focus'
</script>

<template>
  <BaseModal title="Draft with your agent" @close="emit('close')">
    <div class="space-y-4 px-5 py-4">
      <section class="space-y-2">
        <label class="block space-y-1.5">
          <span class="text-xs font-medium text-muted">1. Describe the diagram</span>
          <textarea
            v-model="description"
            rows="4"
            :class="field"
            placeholder="A checkout: the web app calls a payments API, which charges Stripe and writes orders to PostgreSQL. Failed payments retry."
          />
        </label>
        <p class="text-xs text-muted">
          The prompt teaches the agent the .flow format and asks for your diagram in it. Your own
          Claude, ChatGPT or coding agent drafts it; isketch sends nothing anywhere.
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            :class="button"
            :aria-disabled="!prompt"
            :disabled="!prompt"
            @click="copyPrompt"
          >
            {{ copied ? 'Copied' : 'Copy prompt' }}
          </button>
          <a
            v-for="agent in AGENT_LINKS"
            :key="agent.id"
            :class="button"
            :href="prompt ? agent.url(prompt) : undefined"
            :aria-disabled="!prompt"
            target="_blank"
            rel="noopener"
          >
            {{ agent.label }}
          </a>
        </div>
      </section>

      <section class="space-y-2 border-t border-line pt-4">
        <label class="block space-y-1.5">
          <span class="text-xs font-medium text-muted">2. Paste the answer</span>
          <textarea
            v-model="answer"
            rows="5"
            :class="[field, 'font-mono text-xs']"
            spellcheck="false"
            aria-describedby="draft-status"
          />
        </label>
        <p
          id="draft-status"
          class="text-xs"
          :class="draft && !draft.document ? 'text-danger' : 'text-muted'"
          role="status"
        >
          {{ status }}
        </p>
        <div class="flex justify-end">
          <button
            type="button"
            class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-ink transition-opacity hover:opacity-90 disabled:opacity-40"
            :disabled="!draft?.document"
            @click="use"
          >
            Use this diagram
          </button>
        </div>
      </section>
    </div>
  </BaseModal>
</template>
