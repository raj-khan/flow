<script setup>
/**
 * The eraser: a click, or a drag across the canvas, marks every shape and
 * connection it touches, and lifting the pointer deletes them as one change.
 */
const emit = defineEmits(['erase'])

/** @type {Map<Element, { kind: 'node' | 'edge', id: string }>} */
const marked = new Map()
let isDown = false

/**
 * What is under the pointer, beneath this layer.
 * @param {PointerEvent} event
 */
function hit(event) {
  for (const element of document.elementsFromPoint(event.clientX, event.clientY)) {
    const node = element.closest('.vue-flow__node')
    const edge = node ? null : element.closest('.vue-flow__edge')
    const target = node ?? edge
    const id = target?.getAttribute('data-id')
    if (!target || !id) continue
    if (!marked.has(target)) {
      marked.set(target, { kind: node ? 'node' : 'edge', id })
      target.classList.add('is-erasing')
    }
    return
  }
}

/** @param {PointerEvent} event */
function down(event) {
  if (event.button !== 0) return
  event.preventDefault()
  isDown = true
  hit(event)
}

/** @param {PointerEvent} event */
function move(event) {
  if (isDown) hit(event)
}

function up() {
  if (!isDown) return
  isDown = false
  const all = [...marked.entries()]
  marked.clear()
  all.forEach(([element]) => element.classList.remove('is-erasing'))
  if (!all.length) return
  emit('erase', {
    nodes: all.filter(([, item]) => item.kind === 'node').map(([, item]) => item.id),
    edges: all.filter(([, item]) => item.kind === 'edge').map(([, item]) => item.id),
  })
}
</script>

<template>
  <div
    class="nodrag nopan absolute inset-0 z-[5] cursor-crosshair touch-none"
    data-testid="eraser-layer"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="up"
    @pointercancel="up"
    @pointerleave="up"
  />
</template>
