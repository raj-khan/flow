<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

/**
 * What can be done to one shape or connection, at the point it was asked for:
 * a right click, or a long press on a touch screen.
 *
 * @typedef {{ label: string, run: () => void, danger?: boolean }} Item
 */
const props = defineProps({
  /** Where it opens, in page coordinates. */
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  label: { type: String, required: true },
  items: { type: /** @type {import('vue').PropType<Item[]>} */ (Array), required: true },
})

const emit = defineEmits(['close'])

const list = useTemplateRef('list')
const WIDTH = 208

/** Kept on screen, however near the edge it was asked for. */
const style = computed(() => {
  const height = props.items.length * 44 + 12
  return {
    left: `${Math.max(8, Math.min(props.x, window.innerWidth - WIDTH - 8))}px`,
    top: `${Math.max(8, Math.min(props.y, window.innerHeight - height - 8))}px`,
    width: `${WIDTH}px`,
  }
})

const buttons = () =>
  [...(list.value?.querySelectorAll('[role="menuitem"]') ?? [])].map(
    (item) => /** @type {HTMLElement} */ (item),
  )

/** @param {Item} item */
function choose(item) {
  emit('close')
  item.run()
}

/** @param {KeyboardEvent} event */
function onKeydown(event) {
  const all = buttons()
  const at = all.indexOf(/** @type {HTMLElement} */ (document.activeElement))
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    const step = event.key === 'ArrowDown' ? 1 : -1
    all[(at + step + all.length) % all.length]?.focus()
  } else if (event.key === 'Escape' || event.key === 'Tab') {
    event.preventDefault()
    event.stopPropagation()
    emit('close')
  }
}

/** @param {PointerEvent} event */
function onOutside(event) {
  if (!list.value?.contains(/** @type {Node} */ (event.target))) emit('close')
}

watch(
  () => [props.x, props.y],
  async () => {
    await nextTick()
    buttons()[0]?.focus()
  },
  { immediate: true },
)

const close = () => emit('close')
/** @type {ReturnType<typeof setTimeout> | undefined} */
let arming

onMounted(() => {
  // After the press that opened it, so that press does not close it again.
  arming = setTimeout(() => window.addEventListener('pointerdown', onOutside), 0)
  window.addEventListener('wheel', close, { passive: true })
})
onBeforeUnmount(() => {
  clearTimeout(arming)
  window.removeEventListener('pointerdown', onOutside)
  window.removeEventListener('wheel', close)
})
</script>

<template>
  <Teleport to="body">
    <div
      ref="list"
      role="menu"
      :aria-label="label"
      class="island fixed z-50 p-1.5"
      :style="style"
      @keydown="onKeydown"
      @contextmenu.prevent
    >
      <button
        v-for="item in items"
        :key="item.label"
        type="button"
        role="menuitem"
        class="flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-hover focus:bg-hover focus:outline-none"
        :class="item.danger ? 'text-danger' : 'text-ink'"
        @click="choose(item)"
      >
        {{ item.label }}
      </button>
    </div>
  </Teleport>
</template>
