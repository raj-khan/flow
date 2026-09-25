<script setup>
import { computed } from 'vue'

import IconButton from '@/components/ui/IconButton.vue'
import { useFlowHistory } from '@/composables/useFlowHistory.js'
import { usePlatform } from '@/composables/usePlatform.js'
import { COMBO, comboLabel } from '@/domain/shortcuts.js'

/**
 * Undo and redo, bottom left. Outside the canvas, because an emptied canvas
 * unmounts it and "New diagram" must still be undoable. The one place the
 * shortcuts are bound.
 */
const { undo, redo, history } = useFlowHistory({ bindKeys: true })
const { isMac } = usePlatform()
const undoHint = computed(() => comboLabel(COMBO.UNDO, isMac.value))
const redoHint = computed(() => comboLabel(COMBO.REDO, isMac.value))
</script>

<template>
  <div class="island flex items-center gap-0.5 p-1" role="toolbar" aria-label="History">
    <IconButton
      label="Undo"
      variant="bare"
      :title="
        history.canUndo
          ? `Undo ${history.undoLabel.toLowerCase()} (${undoHint})`
          : 'Nothing to undo'
      "
      :disabled="!history.canUndo"
      @click="undo"
    >
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
    </IconButton>

    <IconButton
      label="Redo"
      variant="bare"
      :title="
        history.canRedo
          ? `Redo ${history.redoLabel.toLowerCase()} (${redoHint})`
          : 'Nothing to redo'
      "
      :disabled="!history.canRedo"
      @click="redo"
    >
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9a5 5 0 0 0 0 10h3" />
    </IconButton>
  </div>
</template>
