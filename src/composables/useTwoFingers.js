import { onBeforeUnmount, onMounted } from 'vue'

/** Vue Flow's zoom limits, which the gesture keeps to. */
const ZOOM = { MIN: 0.2, MAX: 2 }

/**
 * Pinch to zoom and two fingers to pan, anywhere on the canvas. Vue Flow's own
 * gesture never starts when a finger lands on a shape, whose drag handler
 * keeps the touch to itself, and on a phone shapes cover most of the screen.
 * So two fingers are handled here, in the capture phase, before either sees
 * them. The point between the fingers stays under them.
 *
 * @param {import('vue').Ref<HTMLElement | null>} target
 * @param {{
 *   viewport: () => { x: number, y: number, zoom: number },
 *   setViewport: (next: { x: number, y: number, zoom: number }) => void,
 * }} flow
 */
export function useTwoFingers(target, flow) {
  /** @type {{ distance: number, centre: { x: number, y: number }, viewport: { x: number, y: number, zoom: number } } | null} */
  let start = null

  /** @param {TouchList} touches */
  const measure = (touches) => {
    const [a, b] = [touches[0], touches[1]]
    const box = target.value?.getBoundingClientRect() ?? { left: 0, top: 0 }
    return {
      distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1,
      centre: {
        x: (a.clientX + b.clientX) / 2 - box.left,
        y: (a.clientY + b.clientY) / 2 - box.top,
      },
    }
  }

  /** @param {TouchEvent} event */
  function onStart(event) {
    if (event.touches.length !== 2) return
    event.stopPropagation()
    start = { ...measure(event.touches), viewport: { ...flow.viewport() } }
  }

  /** @param {TouchEvent} event */
  function onMove(event) {
    if (!start || event.touches.length < 2) return
    event.stopPropagation()
    event.preventDefault()
    const now = measure(event.touches)
    const from = start.viewport
    const zoom = Math.min(ZOOM.MAX, Math.max(ZOOM.MIN, (from.zoom * now.distance) / start.distance))
    // The diagram point that was between the fingers, kept between them.
    const point = {
      x: (start.centre.x - from.x) / from.zoom,
      y: (start.centre.y - from.y) / from.zoom,
    }
    flow.setViewport({ x: now.centre.x - point.x * zoom, y: now.centre.y - point.y * zoom, zoom })
  }

  /** @param {TouchEvent} event */
  function onEnd(event) {
    if (start && event.touches.length < 2) start = null
  }

  onMounted(() => {
    const element = target.value
    element?.addEventListener('touchstart', onStart, { capture: true })
    element?.addEventListener('touchmove', onMove, { capture: true, passive: false })
    element?.addEventListener('touchend', onEnd, { capture: true })
    element?.addEventListener('touchcancel', onEnd, { capture: true })
  })
  onBeforeUnmount(() => {
    const element = target.value
    element?.removeEventListener('touchstart', onStart, { capture: true })
    element?.removeEventListener('touchmove', onMove, { capture: true })
    element?.removeEventListener('touchend', onEnd, { capture: true })
    element?.removeEventListener('touchcancel', onEnd, { capture: true })
  })
}
