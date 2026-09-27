<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { RouterView } from 'vue-router'

import FlowCanvas from '@/components/canvas/FlowCanvas.vue'
import ShapePalette from '@/components/palette/ShapePalette.vue'
import TextPanel from '@/components/text/TextPanel.vue'
import ImportDialog from '@/components/import/ImportDialog.vue'
import CompareDialog from '@/components/compare/CompareDialog.vue'
import ExportDialog from '@/components/export/ExportDialog.vue'
import ShareDialog from '@/components/share/ShareDialog.vue'
import HistoryControls from '@/components/shell/HistoryControls.vue'
import MainMenu from '@/components/shell/MainMenu.vue'
import ToolBar from '@/components/shell/ToolBar.vue'
import CommandPalette from '@/components/shell/CommandPalette.vue'
import FileConflictDialog from '@/components/shell/FileConflictDialog.vue'
import HelpDialog from '@/components/ui/HelpDialog.vue'
import IconButton from '@/components/ui/IconButton.vue'
import ToastHost from '@/components/ui/ToastHost.vue'
import { useCopyBrief } from '@/composables/useCopyBrief.js'
import { useFullScreen } from '@/composables/useFullScreen.js'
import { useViewKeys } from '@/composables/useViewKeys.js'
import { useHelpDialog } from '@/composables/useHelpDialog.js'
import { PHONE, useMediaQuery } from '@/composables/useMediaQuery.js'
import { useOpenSharedLink } from '@/composables/useShareLink.js'
import { useLaunch } from '@/composables/useLaunch.js'
import { useCommands } from '@/composables/useCommands.js'
import { useWatchFile } from '@/composables/useWatchFile.js'
import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { useCanvasStore } from '@/stores/canvas.js'
import { useToastStore } from '@/stores/toasts.js'

/**
 * The route view stays a composition surface: the canvas fills the screen and
 * the tools float over it in islands, as in Excalidraw and tldraw.
 */
const canvas = useCanvasStore()
const isImporting = ref(false)
const isComparing = ref(false)
const isExporting = ref(false)
const isSharing = ref(false)
useOpenSharedLink()
useLaunch()
// An agent writing to the open file shows up here as it happens.
const fileWatch = useWatchFile()
const { copyBrief } = useCopyBrief()
const { document } = useFlowQuery()
// Bound at the shell: a dialog that is not mounted cannot listen for its own key.
const help = useHelpDialog()
const fullScreen = useFullScreen()
/** A phone keeps the tools at the thumb: the tool bar docks at the bottom. */
const isPhone = useMediaQuery(PHONE)
const toasts = useToastStore()
useViewKeys({ fullScreen: fullScreen.toggle, zen: canvas.toggleZen })

// A frame's own Export, from its menu.
watch(
  () => canvas.exportAsked,
  () => (isExporting.value = true),
)

/** Ctrl+K: every action and shape, by name. */
const isPaletteOpen = ref(false)
const commands = useCommands({
  open: (dialog) => {
    if (dialog === 'import') isImporting.value = true
    else if (dialog === 'export') isExporting.value = true
    else if (dialog === 'compare') isComparing.value = true
    else if (dialog === 'share') isSharing.value = true
    else help.open()
  },
})

/** @param {KeyboardEvent} event */
function onPaletteKey(event) {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return
  if (event.shiftKey || event.altKey) return
  // The browser's own Ctrl+K jumps to its search bar.
  event.preventDefault()
  if (isPaletteOpen.value) isPaletteOpen.value = false
  else if (!window.document.querySelector('[role="dialog"][aria-modal="true"]')) {
    isPaletteOpen.value = true
  }
}

window.addEventListener('keydown', onPaletteKey)
onBeforeUnmount(() => window.removeEventListener('keydown', onPaletteKey))

/** In zen mode, the edge the pointer is near brings back that edge's islands. */
const EDGE = 96
const near = ref({ top: false, bottom: false })

/** @param {PointerEvent} event */
function onPointerMove(event) {
  near.value = { top: event.clientY < EDGE, bottom: event.clientY > window.innerHeight - EDGE }
}

watch(
  () => canvas.zen,
  (zen) => {
    near.value = { top: false, bottom: false }
    if (zen) {
      window.addEventListener('pointermove', onPointerMove)
      toasts.push('Zen mode. Tools come back near the edges; Alt+Z shows them again.')
    } else window.removeEventListener('pointermove', onPointerMove)
  },
)
onBeforeUnmount(() => window.removeEventListener('pointermove', onPointerMove))
</script>

<template>
  <div class="relative h-full w-full overflow-hidden bg-canvas">
    <main class="absolute inset-0">
      <FlowCanvas />
    </main>

    <!-- A link opened on a phone: to read, hand to an agent, or start editing. -->
    <template v-if="canvas.isViewing">
      <header class="pointer-events-none absolute inset-x-0 top-0 z-30 p-3">
        <div class="island pointer-events-auto inline-flex max-w-full px-3 py-2">
          <h1 class="truncate text-sm font-semibold">{{ document?.title || 'Shared diagram' }}</h1>
        </div>
      </header>
      <div
        class="absolute inset-x-3 bottom-3 z-30 flex gap-2"
        role="toolbar"
        aria-label="Shared diagram"
      >
        <button
          type="button"
          class="island min-h-11 flex-1 px-4 text-sm font-semibold"
          @click="canvas.setViewing(false)"
        >
          Edit
        </button>
        <button
          type="button"
          class="min-h-11 flex-1 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-ink"
          @click="copyBrief"
        >
          Copy for AI
        </button>
      </div>
    </template>

    <template v-else>
      <!-- Islands let the canvas through everywhere they are not. -->
      <header
        class="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-3 *:pointer-events-auto"
        :class="{ 'zen-hidden': canvas.zen && !near.top }"
      >
        <MainMenu
          @help="help.open"
          @import="isImporting = true"
          @compare="isComparing = true"
          @export="isExporting = true"
          @commands="isPaletteOpen = true"
        />

        <HistoryControls v-if="isPhone" class="mr-auto" />
        <ToolBar v-else class="absolute left-1/2 -translate-x-1/2" />

        <div class="island flex shrink-0 items-center gap-1 p-1">
          <IconButton
            label="Share"
            variant="bare"
            title="Share a private link, or publish one an AI can read"
            @click="isSharing = true"
          >
            <circle cx="18" cy="5" r="2.5" />
            <circle cx="6" cy="12" r="2.5" />
            <circle cx="18" cy="19" r="2.5" />
            <path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" />
          </IconButton>
          <button
            type="button"
            class="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-ink transition-opacity hover:opacity-90"
            title="Copy the diagram as a Markdown brief for Claude, Copilot or any coding agent"
            @click="copyBrief"
          >
            Copy for AI
          </button>
        </div>
      </header>

      <div v-if="canvas.isTextOpen" class="sheet absolute top-16 bottom-3 left-3 z-10">
        <TextPanel />
      </div>

      <div
        v-if="canvas.isLibraryOpen"
        class="sheet absolute top-16 bottom-3 left-3 z-20 flex items-start"
      >
        <ShapePalette class="max-h-full" @add="canvas.requestShape" />
      </div>

      <div
        class="absolute bottom-3 left-3 z-20 flex items-center gap-2 max-md:right-3 max-md:flex-col"
        :class="{ 'zen-hidden': canvas.zen && !near.bottom }"
      >
        <HistoryControls v-if="!isPhone" />
        <!-- CanvasControls teleports here from inside Vue Flow. -->
        <div id="canvas-controls" />
        <ToolBar v-if="isPhone" />
      </div>
    </template>

    <!-- Nested, so the drawer mounts over the canvas without unmounting it. -->
    <RouterView v-slot="{ Component }">
      <Transition name="drawer">
        <component :is="Component" />
      </Transition>
    </RouterView>

    <HelpDialog v-if="help.isOpen.value" @close="help.close" />
    <ImportDialog v-if="isImporting" @close="isImporting = false" />
    <CompareDialog v-if="isComparing" @close="isComparing = false" />
    <ExportDialog v-if="isExporting" @close="isExporting = false" />
    <ShareDialog v-if="isSharing" @close="isSharing = false" />
    <FileConflictDialog
      v-if="canvas.fileConflict"
      :name="canvas.fileConflict.name"
      @theirs="fileWatch.takeTheirs"
      @mine="fileWatch.keepMine"
    />
    <CommandPalette v-if="isPaletteOpen" :commands="commands" @close="isPaletteOpen = false" />
    <ToastHost />
  </div>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: transform var(--slow) var(--ease);
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(calc(100% + 1rem));
}

/* On a phone the drawer is a sheet, and rises from the bottom. */
@media (max-width: 767px) {
  .drawer-enter-from,
  .drawer-leave-to {
    transform: translateY(100%);
  }
}
</style>
