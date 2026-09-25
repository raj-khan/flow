<script setup>
import {
  computed,
  markRaw,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  useTemplateRef,
  watch,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'

import { useFlowQuery } from '@/composables/useFlowQuery.js'
import {
  useConnectNodes,
  useCreateNode,
  useDeleteNodes,
  useDisconnect,
  useMoveNode,
  useMoveNodes,
  useResizeNode,
  useUpdateEdge,
  useStyleEdge,
  useUpdateNode,
} from '@/composables/useNodeMutations.js'
import { useCanvasClipboard } from '@/composables/useCanvasClipboard.js'
import { useFlowHistory } from '@/composables/useFlowHistory.js'
import { useStartDiagram } from '@/composables/useStartDiagram.js'
import { useCanvasStore } from '@/stores/canvas.js'
import { useCanvasKeyboard } from '@/composables/useCanvasKeyboard.js'
import { isOpenable, metaFor } from '@/domain/nodeMeta.js'
import { canConnect, edgeIdFor, toNodeId } from '@/domain/graph.js'
import { isInView, panDuration } from '@/domain/motion.js'
import { isSketch } from '@/domain/sketch.js'
import { GRID } from '@/domain/arrange.js'
import { TOOL } from '@/domain/tools.js'
import SelectionToolbar from './SelectionToolbar.vue'
import PenLayer from './PenLayer.vue'
import { useToastStore } from '@/stores/toasts.js'
import { ROUTE } from '@/router/index.js'
import { nodeComponents } from './nodeComponents.js'
import { FOCUSED_NODE_ID } from './focusKey.js'
import { ARROW, CONNECT_STATE, DETACH_EDGE, STYLE_EDGE } from './connectKey.js'
import { EDIT_TEXT } from './editKey.js'
import { RESIZE_NODE } from './resizeKey.js'
import { LINE_STYLE, SKETCH } from './sketchKey.js'
import { SHAPE_DRAG_TYPE } from '@/components/palette/dragType.js'
import { NODE_SIZE } from '@/domain/constants.js'
import { freeSpotNear } from '@/domain/layout.js'
import FlowEdge from './FlowEdge.vue'
import CanvasControls from './CanvasControls.vue'
import CanvasState from './CanvasState.vue'

const route = useRoute()
const router = useRouter()
const canvas = useCanvasStore()
const { document: diagram, nodes, edges, isLoading, isError, error, refetch } = useFlowQuery()
const moveNode = useMoveNode()
const connectNodes = useConnectNodes()
const disconnect = useDisconnect()
const createNode = useCreateNode()
const moveNodes = useMoveNodes()
const deleteNodes = useDeleteNodes()
const updateNode = useUpdateNode()
const updateEdge = useUpdateEdge()
const styleEdge = useStyleEdge()
const resizeNode = useResizeNode()

provide(
  SKETCH,
  computed(() => isSketch(diagram.value)),
)

provide(
  RESIZE_NODE,
  (
    /** @type {string} */ id,
    /** @type {{ x: number, y: number, width: number, height: number }} */ box,
  ) =>
    resizeNode.mutate({
      id,
      position: { x: Math.round(box.x), y: Math.round(box.y) },
      size: { width: Math.round(box.width), height: Math.round(box.height) },
    }),
)

/** The shape or edge whose text is being edited in place, or empty. */
const editingId = ref('')

provide(EDIT_TEXT, {
  editingId,
  start: (/** @type {string} */ id) => (editingId.value = id),
  stop: () => (editingId.value = ''),
  renameNode: (/** @type {string} */ id, /** @type {string} */ name) =>
    updateNode.mutate({ id, patch: { name } }),
  relabelEdge: (/** @type {string} */ id, /** @type {string} */ label) =>
    updateEdge.mutate({ id, patch: { label } }),
})
const { undo } = useFlowHistory()
const { start } = useStartDiagram()
const toasts = useToastStore()
const {
  addEdges,
  addNodes,
  findNode,
  getEdges,
  fitView,
  getNodes,
  removeNodes,
  screenToFlowCoordinate,
  setViewport,
  updateNode: updateFlowNode,
  viewport,
  getSelectedNodes,
  getSelectedEdges,
  addSelectedNodes,
  removeSelectedNodes,
} = useVueFlow()

// These are component definitions, not reactive data: without markRaw Vue walks
// every component tree on each render.
const nodeTypes = /** @type {import('@vue-flow/core').NodeTypesObject} */ (
  /** @type {unknown} */ (markRaw(nodeComponents))
)

const edgeTypes = /** @type {any} */ (markRaw({ flow: FlowEdge }))

const hasFitted = ref(false)

// An emptied canvas unmounts Vue Flow, so whatever fills it next is fitted afresh.
watch(
  () => nodes.value.length === 0,
  (empty) => {
    if (empty) hasFitted.value = false
  },
)

/** Matches the drawer width in NodeDetailsDrawer. */
const DRAWER_WIDTH = 380

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

const container = useTemplateRef('container')

/** The drawer and the create dialog own the keyboard while they are open. */
const {
  focusedId,
  focus,
  clear: clearFocus,
} = useCanvasKeyboard({
  nodes,
  onOpen: (id) => router.push({ name: ROUTE.NODE_DETAILS, params: { id } }),
  isActive: () => !document.querySelector('[role="dialog"][aria-modal="true"]'),
})

provide(FOCUSED_NODE_ID, focusedId)

const focusAnnouncement = computed(() => {
  if (!focusedId.value) return ''
  const node = nodes.value.find((candidate) => candidate.id === focusedId.value)?.data.node
  return node ? `${node.name}, ${metaFor(node.type).label}. Press Enter to open details.` : ''
})

// However the drawer was opened, the open node is the focused node.
watch(
  () => route.params.id,
  (id) => {
    if (typeof id === 'string' && id) focus(id)
    else clearFocus()
  },
  { immediate: true },
)

// Pan a focused node into view without changing the zoom.
/**
 * Set by a click. A shape someone just clicked is on screen already, and
 * moving the canvas under the pointer made it hard to click anything twice.
 */
let focusedByPointer = false

watch(focusedId, async (id) => {
  if (focusedByPointer) {
    focusedByPointer = false
    return
  }
  // A node the canvas is already moving to owns the movement: two pans at once
  // read as the screen lurching twice.
  if (!id || canvas.focusNodeId === id) return

  await nextTick()
  const node = findNode(id)
  if (node?.dimensions?.width) centreOn(node)
})

/**
 * Applied as a diff, not with `setNodes`. Replacing the array throws away the
 * handle bounds Vue Flow measured, and an edge whose handles are gone is never
 * drawn, so every edge vanished after any save until the page was reloaded.
 *
 * A one-way `:nodes` prop is no good either: Vue Flow could not write a dragged
 * position back.
 *
 * @param {import('@/domain/types.js').VueFlowNode[]} nextNodes
 * @param {import('@/domain/types.js').VueFlowEdge[]} nextEdges
 * @param {string} openId
 * @param {boolean} openChanged
 */
function syncGraph(nextNodes, nextEdges, openId, openChanged) {
  const known = new Map(getNodes.value.map((node) => [node.id, node]))
  const wanted = new Set(nextNodes.map((node) => node.id))

  const gone = [...known.keys()].filter((id) => !wanted.has(id))
  if (gone.length) removeNodes(gone)

  const fresh = nextNodes.filter((node) => !known.has(node.id))
  if (fresh.length) addNodes(fresh.map((node) => ({ ...node, selected: node.id === openId })))

  for (const node of nextNodes) {
    const current = known.get(node.id)
    if (!current) continue

    // The open node is the highlighted one, so a shared link marks it too. Only
    // when it changes: on every save this would undo a selection made by hand.
    const sized =
      current.width !== node.width || current.height !== node.height
        ? { width: node.width, height: node.height }
        : {}
    const update = openChanged
      ? { data: node.data, selected: node.id === openId, ...sized }
      : { data: node.data, ...sized }
    const moved =
      Math.abs(current.position.x - node.position.x) > 0.5 ||
      Math.abs(current.position.y - node.position.y) > 0.5

    updateFlowNode(node.id, moved ? { ...update, position: node.position } : update)
  }

  /*
   * Edges are updated in place and hidden when they go, never removed.
   * `setEdges` drops every edge, and `addEdges` is refused for a connection Vue
   * Flow still remembers, so an undone detach could never be drawn again.
   */
  const wantedEdges = new Map(nextEdges.map((edge) => [edge.id, edge]))

  for (const edge of getEdges.value) {
    const next = wantedEdges.get(edge.id)
    if (!next) {
      edge.hidden = true
      continue
    }

    if (edge.source !== next.source) edge.source = next.source
    if (edge.target !== next.target) edge.target = next.target
    // Labels change too, from the text pane or in place, and an edge is never re-added.
    if ((edge.label ?? '') !== (next.label ?? '')) edge.label = next.label
    if (
      Boolean(edge.data?.dashed) !== Boolean(next.data?.dashed) ||
      Boolean(edge.data?.both) !== Boolean(next.data?.both)
    ) {
      edge.data = { ...next.data }
    }
    edge.hidden = false
    wantedEdges.delete(edge.id)
  }

  if (wantedEdges.size) drawFromData([...wantedEdges.values()].map((edge) => ({ ...edge })))
}

watch(
  [nodes, edges, () => route.params.id],
  ([nextNodes, nextEdges, openId], previous) =>
    syncGraph(nextNodes, nextEdges, String(openId ?? ''), !previous || previous[2] !== openId),
  { immediate: true },
)

let fromData = false

/**
 * Vue Flow runs `isValidConnection` for `addEdges` too, and would refuse an edge
 * the document already holds as a duplicate. An edge that only depicts the data
 * goes in with the gate open.
 *
 * @param {import('@/domain/types.js').VueFlowEdge[]} list
 */
function drawFromData(list) {
  fromData = true
  addEdges(list)
  fromData = false
}

/** @param {{ node: import('@vue-flow/core').GraphNode, event: MouseEvent | TouchEvent }} event */
function onNodeClick({ node, event }) {
  if (canvas.tool === TOOL.HAND) return
  if (canvas.tool === TOOL.ERASER) {
    removeShapes([node.id])
    return
  }
  if (canvas.tool === TOOL.CONNECTOR) {
    connectByClicks(node.id)
    return
  }
  if (canvas.tool === TOOL.TEXT) {
    editingId.value = node.id
    return
  }
  // A modifier click adds to the selection; opening the drawer would drop it.
  if (event && 'shiftKey' in event && (event.shiftKey || event.ctrlKey || event.metaKey)) return
  if (!isOpenable(node.data.node)) return
  focusedByPointer = focusedId.value !== node.id
  focus(node.id)
  router.push({ name: ROUTE.NODE_DETAILS, params: { id: node.id } })
}

/** The node a connection is being dragged from, or empty. */
const connectingFrom = ref('')

provide(CONNECT_STATE, {
  from: connectingFrom,
  accepts: (/** @type {string} */ id) =>
    Boolean(connectingFrom.value) && canConnect(diagram.value, connectingFrom.value, id) === null,
})

/** @param {{ nodeId?: string | null }} event */
function onConnectStart(event) {
  connectingFrom.value = toNodeId(event?.nodeId ?? '')
}

function onConnectEnd() {
  connectingFrom.value = ''
}

/**
 * The connector tool: the first click picks the shape a connection leaves
 * from, and lights up the shapes it can go to; the second makes it.
 * @param {string} id
 */
function connectByClicks(id) {
  const from = connectingFrom.value
  if (!from || from === id) {
    connectingFrom.value = from === id ? '' : id
    return
  }
  connectingFrom.value = ''
  onConnect({ source: from, target: id })
}

// A connection half made by clicks is dropped with the tool.
watch(
  () => canvas.tool,
  () => (connectingFrom.value = ''),
)

/** @param {{ edge: { id: string } }} event */
function onEdgeClick({ edge }) {
  if (canvas.tool === TOOL.ERASER) detach(edge.id)
}

/**
 * The text tool writes where the canvas is clicked, then hands back to Select;
 * a click on empty canvas also drops a connection half made by clicks.
 * @param {MouseEvent} event
 */
function onPaneClick(event) {
  connectingFrom.value = ''
  if (canvas.tool !== TOOL.TEXT) return
  addShape('text', screenToFlowCoordinate({ x: event.clientX, y: event.clientY }), {
    exact: true,
  })
  canvas.setTool(TOOL.SELECT)
}

/**
 * Checked while the line is being dragged, so an invalid target refuses the drop
 * instead of explaining itself afterwards.
 *
 * @param {{ source: string | null, target: string | null }} connection
 * @returns {boolean}
 */
function isValidConnection({ source, target }) {
  if (fromData) return true
  if (!source || !target) return false

  return canConnect(diagram.value, toNodeId(source), toNodeId(target)) === null
}

/** @param {{ source: string, target: string }} connection */
function onConnect({ source, target }) {
  const from = toNodeId(source)
  const to = toNodeId(target)
  const refusal = canConnect(diagram.value, from, to)

  if (refusal) {
    toasts.push(refusal, { tone: 'danger' })
    return
  }

  // Drawn here, with the id the adapter will use. Vue Flow remembers the
  // connection the drag just made and refuses to add it again afterwards, so an
  // edge left to the next sync never appears.
  addEdges([{ id: edgeIdFor(from, to), source: from, target: to, type: 'flow' }])

  connectNodes.mutate({ source: from, target: to, position: pinnedPosition(to) })
}

/**
 * A new or removed edge changes where the layout would put a node, so its
 * current position is pinned in the same write. Otherwise it jumps.
 *
 * @param {string} id
 * @returns {{ x: number, y: number } | undefined}
 */
function pinnedPosition(id) {
  const node = findNode(id)
  return node ? { x: node.position.x, y: node.position.y } : undefined
}

/** @param {string} edgeId */
function detach(edgeId) {
  const edge = edges.value.find((candidate) => candidate.id === edgeId)
  if (!edge) return
  disconnect.mutate({ id: edge.id, target: edge.target, position: pinnedPosition(edge.target) })
}

provide(DETACH_EDGE, detach)
provide(STYLE_EDGE, (id, style) => styleEdge.mutate({ id, patch: style }))
provide(
  LINE_STYLE,
  computed(() => diagram.value?.lines ?? 'step'),
)

/**
 * Snapping is on only while dragging: Vue Flow also snaps shapes as they are
 * first drawn, which would put laid-out shapes somewhere the diagram, and its
 * SVG, do not.
 */
const isDragging = ref(false)

/** @param {{ node: import('@vue-flow/core').GraphNode, nodes: import('@vue-flow/core').GraphNode[] }} event */
function onNodeDragStop({ node, nodes: dragged }) {
  isDragging.value = false
  // Plain objects, not Vue Flow's reactive positions.
  if (dragged?.length > 1) {
    moveNodes.mutate({
      positions: Object.fromEntries(
        dragged.map((each) => [each.id, { x: each.position.x, y: each.position.y }]),
      ),
    })
    return
  }
  moveNode.mutate({ id: node.id, position: { x: node.position.x, y: node.position.y } })
}

/**
 * Keys meant for a field or a dialog are theirs, not the canvas's.
 * @param {Event} event
 */
function isBlocked(event) {
  const target = /** @type {HTMLElement | null} */ (event.target)
  if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return true
  if (target?.isContentEditable) return true
  return Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'))
}

/**
 * Delete shapes, with their edges, as one undoable change.
 * @param {string[]} ids
 */
function removeShapes(ids) {
  router.push({ name: ROUTE.FLOW })
  deleteNodes.mutate(
    { ids },
    {
      onSuccess: () =>
        toasts.push(ids.length === 1 ? 'Deleted a shape' : `Deleted ${ids.length} shapes`, {
          action: { label: 'Undo', run: undo },
        }),
    },
  )
}

useCanvasClipboard({
  selectedIds: () => getSelectedNodes.value.map((node) => node.id),
  remove: removeShapes,
  isBlocked,
  // Pasted shapes arrive selected, so they can be dragged straight into place.
  select: async (ids) => {
    removeSelectedNodes(getSelectedNodes.value)
    const added = (await Promise.all(ids.map(waitForNode))).filter(Boolean)
    addSelectedNodes(/** @type {any[]} */ (added))
  },
})

/**
 * Select all, and delete a selection as one undoable step. Vue Flow's own
 * delete key is off: it removed shapes from the canvas without touching the
 * diagram. The drawer's button confirms; the key does not, and the toast's Undo
 * is the safety net, as in every drawing tool.
 *
 * @param {KeyboardEvent} event
 */
function onSelectionKeys(event) {
  if (isBlocked(event)) return

  // F2 renames the shape the keyboard is on, as in a file manager.
  if (event.key === 'F2' && focusedId.value) {
    event.preventDefault()
    editingId.value = focusedId.value
    return
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
    event.preventDefault()
    addSelectedNodes(getNodes.value)
    return
  }

  if (event.key === 'Escape' && getSelectedNodes.value.length > 1) {
    removeSelectedNodes(getSelectedNodes.value)
    return
  }

  if (event.key !== 'Delete' && event.key !== 'Backspace') return
  const ids = getSelectedNodes.value.map((node) => node.id)
  const edgeIds = getSelectedEdges.value.map((edge) => edge.id)
  if (!ids.length && !edgeIds.length) return
  event.preventDefault()

  // A shape's edges go with it, so only lone edges are removed on their own.
  if (!ids.length) {
    edgeIds.forEach(detach)
    return
  }

  removeShapes(ids)
}

onMounted(() => window.addEventListener('keydown', onSelectionKeys))
onBeforeUnmount(() => window.removeEventListener('keydown', onSelectionKeys))

/**
 * Vue Flow measures nodes after they mount, and `fitView` needs those dimensions.
 * Called any earlier it fits an unmeasured graph and clips the edge.
 */
function onNodesInitialized() {
  if (hasFitted.value) return
  hasFitted.value = true

  if (canvas.viewport) setViewport(canvas.viewport)
  else fitView({ padding: 0.2, duration: 0 })
}

/**
 * A created node is asked for by its server id, but the cache still holds the
 * optimistic one until the refetch lands, so Vue Flow does not know the id yet
 * and an immediate fitView is a silent no-op.
 *
 * @param {string} id
 */
async function waitForNode(id) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const node = findNode(id)
    if (node?.dimensions?.width) return node
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  return null
}

/**
 * Centre a node in the space the drawer leaves. Computed rather than `fitView`,
 * which does not move for a single node once the flow is already fitted.
 *
 * @param {import('@vue-flow/core').GraphNode} node
 */
function centreOn(node) {
  const pane = container.value?.getBoundingClientRect()
  if (!pane) return

  const { x, y, zoom } = viewport.value
  const view = {
    width: pane.width - (route.params.id ? DRAWER_WIDTH : 0),
    height: pane.height,
  }

  const onScreen = {
    x: node.position.x * zoom + x,
    y: node.position.y * zoom + y,
    width: (node.dimensions.width || 0) * zoom,
    height: (node.dimensions.height || 0) * zoom,
  }

  // Clicking a node you can already see should not move the canvas at all.
  if (isInView(onScreen, view)) return

  const target = {
    x: view.width / 2 - (node.position.x + (node.dimensions.width || 0) / 2) * zoom,
    y: view.height / 2 - (node.position.y + (node.dimensions.height || 0) / 2) * zoom,
    zoom,
  }

  const distance = Math.hypot(target.x - x, target.y - y)
  setViewport(target, { duration: reducedMotion() ? 0 : panDuration(distance) })
}

/**
 * A new shape, centred on a point in diagram coordinates, then opened so it can
 * be named. Without a point it goes at the origin, which is where an empty
 * diagram is looking.
 *
 * @param {string} shape
 * @param {{ x: number, y: number } | null} at
 * @param {{ exact?: boolean }} [options]
 */
function addShape(shape, at, options = {}) {
  const wanted = at
    ? {
        x: Math.round(at.x - NODE_SIZE.WIDTH / 2),
        y: Math.round(at.y - NODE_SIZE.HEIGHT / 2),
      }
    : { x: 0, y: 0 }
  // A drop lands exactly where it was let go; a click finds room near the middle.
  const position = options.exact ? wanted : freeSpotNear(wanted, nodes.value)

  createNode.mutate(
    { title: metaFor(shape).label, description: '', shape, position },
    {
      onSuccess(node) {
        const id = toNodeId(node.id)
        // Selected, with its title ready to type over, where it was put: no
        // drawer sliding in, and the canvas moves only if the shape is off it.
        router.push({ name: ROUTE.FLOW })
        canvas.requestFocus(id)
        editingId.value = id
        waitForNode(id).then((added) => added && addSelectedNodes([added]))
      },
      onError: () => toasts.push('The shape could not be added.', { tone: 'danger' }),
    },
  )
}

/** The middle of what is visible, less the drawer, in diagram coordinates. */
function viewCentre() {
  const pane = container.value?.getBoundingClientRect()
  if (!pane || !nodes.value.length) return null

  const width = pane.width - (route.params.id ? DRAWER_WIDTH : 0)
  return screenToFlowCoordinate({ x: pane.left + width / 2, y: pane.top + pane.height / 2 })
}

/** @param {DragEvent} event */
function onDragOver(event) {
  if (!event.dataTransfer?.types.includes(SHAPE_DRAG_TYPE)) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
}

/** @param {DragEvent} event */
function onDrop(event) {
  const shape = event.dataTransfer?.getData(SHAPE_DRAG_TYPE)
  if (!shape) return
  event.preventDefault()
  canvas.closeLibrary()

  // An empty canvas has no Vue Flow mounted to translate the point.
  const at = nodes.value.length
    ? screenToFlowCoordinate({ x: event.clientX, y: event.clientY })
    : null
  addShape(shape, at, { exact: true })
}

watch(
  () => canvas.pendingShape,
  (shape) => {
    if (!shape) return
    canvas.clearShapeRequest()
    addShape(shape, viewCentre())
  },
)

watch(
  () => canvas.focusNodeId,
  async (id) => {
    if (!id) return

    const node = await waitForNode(id)
    if (node) centreOn(node)
    canvas.clearFocus()
  },
)
</script>

<template>
  <div
    ref="container"
    class="h-full w-full"
    :class="[connectingFrom ? 'is-connecting' : '', `tool-${canvas.tool}`]"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <CanvasState
      v-if="isLoading || isError || !nodes.length"
      :is-loading="isLoading"
      :is-error="isError"
      :message="error?.message"
      @retry="refetch"
      @sample="start"
    />

    <!-- nodes-deletable stays false: deleting a node keeps its confirmation. -->
    <VueFlow
      v-else
      :node-types="nodeTypes"
      :edge-types="edgeTypes"
      :default-edge-options="{ type: 'flow' }"
      :snap-to-grid="canvas.snap && isDragging"
      :snap-grid="[GRID, GRID]"
      :min-zoom="0.2"
      :max-zoom="2"
      :nodes-connectable="canvas.tool === TOOL.SELECT"
      :nodes-draggable="canvas.tool === TOOL.SELECT"
      :elements-selectable="canvas.tool === TOOL.SELECT"
      :is-valid-connection="isValidConnection"
      :connection-radius="28"
      :nodes-deletable="false"
      :delete-key-code="null"
      :elevate-nodes-on-select="true"
      selection-key-code="Shift"
      :zoom-on-double-click="false"
      :multi-selection-key-code="['Shift', 'Meta', 'Control']"
      class="h-full w-full"
      @nodes-initialized="onNodesInitialized"
      @node-click="onNodeClick"
      @edge-click="onEdgeClick"
      @pane-click="onPaneClick"
      @node-drag-start="isDragging = true"
      @node-drag-stop="onNodeDragStop"
      @connect="onConnect"
      @connect-start="onConnectStart"
      @connect-end="onConnectEnd"
      @viewport-change="canvas.setViewport"
    >
      <Background :gap="GRID" :size="1.2" />
      <SelectionToolbar />
      <PenLayer />
      <CanvasControls />

      <!-- Arrowheads, defined once; their colours follow the theme. -->
      <svg class="absolute h-0 w-0" aria-hidden="true">
        <defs>
          <marker
            v-for="[id, colour] in [
              [ARROW.PLAIN, 'var(--edge)'],
              [ARROW.SELECTED, 'var(--focus)'],
            ]"
            :id="id"
            :key="id"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" :style="{ fill: colour }" />
          </marker>
        </defs>
      </svg>

      <!-- The canvas is a graph, so a screen reader has nothing else to go on. -->
      <div class="sr-only" role="status" aria-live="polite">{{ focusAnnouncement }}</div>
    </VueFlow>
  </div>
</template>

<style scoped>
/* Each tool says what a click will do before it is made. */
.tool-hand :deep(.vue-flow__pane),
.tool-hand :deep(.vue-flow__node) {
  cursor: grab;
}

.tool-connector :deep(.vue-flow__node),
.tool-eraser :deep(.vue-flow__node),
.tool-eraser :deep(.vue-flow__edge) {
  cursor: crosshair;
}

.tool-text :deep(.vue-flow__pane) {
  cursor: text;
}
</style>
