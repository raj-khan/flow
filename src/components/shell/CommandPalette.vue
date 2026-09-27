<script setup>
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue'

import BaseModal from '@/components/ui/BaseModal.vue'
import { filterCommands } from '@/domain/commands.js'

/**
 * Ctrl+K: every action and shape, found by typing. Arrows move, Enter runs,
 * Escape closes. The list is a listbox the search field controls, so a screen
 * reader follows the active item without focus leaving the field.
 */
const props = defineProps({
  commands: {
    type: /** @type {import('vue').PropType<import('@/domain/commands.js').Command[]>} */ (Array),
    required: true,
  },
})

const emit = defineEmits(['close'])

const query = ref('')
const active = ref(0)
const listId = useId()
const list = useTemplateRef('list')

const found = computed(() => filterCommands(props.commands, query.value))
const optionId = (/** @type {number} */ index) => `${listId}-${index}`

watch(query, () => (active.value = 0))

/** @param {number} index */
async function moveTo(index) {
  if (!found.value.length) return
  active.value = (index + found.value.length) % found.value.length
  await nextTick()
  list.value?.querySelector(`#${window.CSS.escape(optionId(active.value))}`)?.scrollIntoView({
    block: 'nearest',
  })
}

/** @param {import('@/domain/commands.js').Command | undefined} command */
function run(command) {
  if (!command) return
  emit('close')
  // After the palette has gone, so a command that opens a dialog gets the focus.
  nextTick(command.run)
}

/** @param {KeyboardEvent} event */
function onKeydown(event) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    moveTo(active.value + (event.key === 'ArrowDown' ? 1 : -1))
  } else if (event.key === 'Enter') {
    event.preventDefault()
    run(found.value[active.value])
  }
}
</script>

<template>
  <BaseModal title="Commands" @close="emit('close')">
    <div class="p-3">
      <input
        v-model="query"
        type="text"
        role="combobox"
        aria-label="Search commands"
        aria-autocomplete="list"
        aria-expanded="true"
        :aria-controls="listId"
        :aria-activedescendant="found.length ? optionId(active) : undefined"
        placeholder="Type a command or a shape"
        class="w-full rounded-lg border border-line bg-sunken px-3 py-2 text-sm text-ink outline-none focus:border-focus"
        autocomplete="off"
        spellcheck="false"
        @keydown="onKeydown"
      />
    </div>

    <ul
      :id="listId"
      ref="list"
      role="listbox"
      aria-label="Commands"
      class="scroll-panel max-h-80 px-1.5 pb-2"
    >
      <li
        v-for="(command, index) in found"
        :id="optionId(index)"
        :key="command.id"
        role="option"
        :aria-selected="index === active ? 'true' : 'false'"
        class="flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm"
        :class="index === active ? 'bg-hover' : ''"
        @pointermove="active = index"
        @click="run(command)"
      >
        <span class="flex-1 text-ink">{{ command.label }}</span>
        <span class="text-xs text-muted">{{ command.group }}</span>
        <kbd v-if="command.hint" class="min-w-12 text-right text-xs text-muted">{{
          command.hint
        }}</kbd>
      </li>
      <li v-if="!found.length" class="px-2.5 py-6 text-center text-sm text-muted">
        Nothing matches “{{ query }}”.
      </li>
    </ul>
  </BaseModal>
</template>
