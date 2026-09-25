<script setup>
import { ref } from 'vue'
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
import HelpDialog from '@/components/ui/HelpDialog.vue'
import IconButton from '@/components/ui/IconButton.vue'
import ToastHost from '@/components/ui/ToastHost.vue'
import { useCopyBrief } from '@/composables/useCopyBrief.js'
import { useHelpDialog } from '@/composables/useHelpDialog.js'
import { useOpenSharedLink } from '@/composables/useShareLink.js'
import { useCanvasStore } from '@/stores/canvas.js'

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
const { copyBrief } = useCopyBrief()
// Bound at the shell: a dialog that is not mounted cannot listen for its own key.
const help = useHelpDialog()
</script>

<template>
  <div class="relative h-full w-full overflow-hidden bg-canvas">
    <main class="absolute inset-0">
      <FlowCanvas />
    </main>

    <!-- Islands let the canvas through everywhere they are not. -->
    <header
      class="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-3 *:pointer-events-auto"
    >
      <MainMenu
        @help="help.open"
        @import="isImporting = true"
        @compare="isComparing = true"
        @export="isExporting = true"
      />

      <ToolBar class="absolute left-1/2 -translate-x-1/2" />

      <div class="island flex items-center gap-1 p-1">
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

    <div v-if="canvas.isTextOpen" class="absolute top-16 bottom-3 left-3 z-10">
      <TextPanel />
    </div>

    <div v-if="canvas.isLibraryOpen" class="absolute top-16 bottom-3 left-3 z-20 flex items-start">
      <ShapePalette class="max-h-full" @add="canvas.requestShape" />
    </div>

    <div class="absolute bottom-3 left-3 z-20 flex items-center gap-2">
      <HistoryControls />
      <!-- CanvasControls teleports here from inside Vue Flow. -->
      <div id="canvas-controls" />
    </div>

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
</style>
