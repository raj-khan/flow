<script setup>
import { nextTick, onMounted, ref, useTemplateRef } from 'vue'

/**
 * A text field that edits in place and gets out of the way: Enter or leaving
 * it saves, Escape puts things back. `nodrag` and `nopan` keep Vue Flow from
 * treating a text selection as a drag of the canvas.
 */
const props = defineProps({
  value: { type: String, default: '' },
  label: { type: String, required: true },
  maxlength: { type: Number, default: 60 },
  /** For a name begun by typing: go on from its last letter rather than replace it. */
  caretAtEnd: { type: Boolean, default: false },
  /**
   * What was typed before this field could take the keys, and whether Enter
   * came too, handed over once it has focus.
   */
  takeTyped: {
    type: /** @type {import('vue').PropType<() => { text: string, enter: boolean }>} */ (Function),
    default: null,
  },
})

const emit = defineEmits(['save', 'cancel'])

const draft = ref(props.value)
const input = useTemplateRef('input')
let done = false

/**
 * Vue Flow keeps a just-added node hidden until it is measured, and a hidden
 * field refuses focus, so this tries again for a few frames until it takes.
 */
function takeFocus(attempts = 10) {
  const field = input.value
  if (!field || done) return
  field.focus()
  if (document.activeElement === field) {
    if (props.caretAtEnd) atEnd(field)
    else field.select()
  } else if (attempts > 0) requestAnimationFrame(() => takeFocus(attempts - 1))
}

/** @param {HTMLInputElement} field */
async function atEnd(field) {
  const typed = props.takeTyped?.()
  if (typed?.text) {
    draft.value += typed.text
    await nextTick()
  }
  field.setSelectionRange(field.value.length, field.value.length)
  if (typed?.enter) save()
}

onMounted(() => takeFocus())

function save() {
  if (done) return
  done = true
  emit('save', draft.value)
}

function cancel() {
  done = true
  emit('cancel')
}
</script>

<template>
  <input
    ref="input"
    v-model="draft"
    class="nodrag nopan w-full rounded-md border border-focus bg-surface px-1.5 py-0.5 text-center text-ink outline-none"
    :aria-label="label"
    :maxlength="maxlength"
    @keydown.enter.prevent="save"
    @keydown.esc.stop.prevent="cancel"
    @blur="save"
    @click.stop
    @dblclick.stop
    @pointerdown.stop
  />
</template>
