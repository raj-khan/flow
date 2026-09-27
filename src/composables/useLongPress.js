import { onBeforeUnmount, onMounted } from 'vue'

/** How long a finger rests before it is a long press, and how far it may drift. */
export const LONG_PRESS = Object.freeze({ MS: 500, SLOP: 10 })

/**
 * A long press with a finger or a stylus, which is how a touch screen asks for
 * a context menu (iOS never sends `contextmenu`). The tap that ends it does
 * not also click. A second finger, as in a pinch, cancels it.
 *
 * @param {import('vue').Ref<HTMLElement | null>} target
 * @param {(event: PointerEvent) => void} onPress
 */
export function useLongPress(target, onPress) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer
  /** @type {{ id: number, x: number, y: number } | null} */
  let down = null
  let pressed = false

  const cancel = () => {
    clearTimeout(timer)
    down = null
  }

  /** @param {PointerEvent} event */
  function onDown(event) {
    if (event.pointerType === 'mouse') return
    if (down) return cancel()
    down = { id: event.pointerId, x: event.clientX, y: event.clientY }
    pressed = false
    timer = setTimeout(() => {
      down = null
      pressed = true
      onPress(event)
    }, LONG_PRESS.MS)
  }

  /** @param {PointerEvent} event */
  function onMove(event) {
    if (!down || event.pointerId !== down.id) return
    if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > LONG_PRESS.SLOP) cancel()
  }

  /** The click a long press ends in is not a tap. @param {MouseEvent} event */
  function onClick(event) {
    if (!pressed) return
    pressed = false
    event.preventDefault()
    event.stopPropagation()
  }

  onMounted(() => {
    const element = target.value
    element?.addEventListener('pointerdown', onDown, true)
    element?.addEventListener('pointermove', onMove, true)
    element?.addEventListener('pointerup', cancel, true)
    element?.addEventListener('pointercancel', cancel, true)
    element?.addEventListener('click', onClick, true)
  })
  onBeforeUnmount(() => {
    cancel()
    const element = target.value
    element?.removeEventListener('pointerdown', onDown, true)
    element?.removeEventListener('pointermove', onMove, true)
    element?.removeEventListener('pointerup', cancel, true)
    element?.removeEventListener('pointercancel', cancel, true)
    element?.removeEventListener('click', onClick, true)
  })
}
