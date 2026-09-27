import { computed } from 'vue'

import { useCopyBrief } from '@/composables/useCopyBrief.js'
import { useDiagramFile } from '@/composables/useDiagramFile.js'
import { useFlowHistory } from '@/composables/useFlowHistory.js'
import { useFullScreen } from '@/composables/useFullScreen.js'
import { useLineStyle } from '@/composables/useLineStyle.js'
import { usePlatform } from '@/composables/usePlatform.js'
import { useSketchStyle } from '@/composables/useSketchStyle.js'
import { useStartDiagram } from '@/composables/useStartDiagram.js'
import { useTheme } from '@/composables/useTheme.js'
import { SHAPE_OPTIONS } from '@/domain/nodeMeta.js'
import { COMBO, comboLabel } from '@/domain/shortcuts.js'
import { TOOLS } from '@/domain/tools.js'
import { useCanvasStore } from '@/stores/canvas.js'
import { useToastStore } from '@/stores/toasts.js'

/**
 * Every action and shape, for the command palette: the menu's, the tools',
 * the view's and one "Add" for each shape in the registry, so a new shape or
 * tool shows up here without a line of its own.
 *
 * @param {{ open: (dialog: 'import' | 'export' | 'compare' | 'share' | 'help') => void }} shell
 */
export function useCommands(shell) {
  const canvas = useCanvasStore()
  const { copyBrief } = useCopyBrief()
  const { open, save } = useDiagramFile()
  const { start } = useStartDiagram()
  const { undo, redo } = useFlowHistory()
  const { toggle: toggleSketch } = useSketchStyle()
  const { label: themeLabel, cycle: cycleTheme } = useTheme()
  const fullScreen = useFullScreen()
  const { cycle: cycleLines } = useLineStyle()
  const { isMac } = usePlatform()
  const toasts = useToastStore()
  const startEmpty = () =>
    start(undefined, {
      onSuccess: () =>
        toasts.push('Started a new diagram', { action: { label: 'Undo', run: undo } }),
    })
  const key = (/** @type {string[]} */ combo) => comboLabel(combo, isMac.value)

  /** @type {import('vue').ComputedRef<import('@/domain/commands.js').Command[]>} */
  return computed(() => [
    {
      id: 'copy-brief',
      label: 'Copy for AI',
      group: 'Share',
      keywords: 'brief markdown agent claude',
      run: copyBrief,
    },
    {
      id: 'share',
      label: 'Share',
      group: 'Share',
      keywords: 'link publish',
      run: () => shell.open('share'),
    },
    {
      id: 'new',
      label: 'New diagram',
      group: 'File',
      keywords: 'empty blank start',
      run: startEmpty,
    },
    { id: 'open', label: 'Open file', group: 'File', hint: key(COMBO.OPEN), run: open },
    { id: 'save', label: 'Save', group: 'File', hint: key(COMBO.SAVE), run: save },
    {
      id: 'import',
      label: 'Import',
      group: 'File',
      keywords: 'mermaid drawio compose openapi sql',
      run: () => shell.open('import'),
    },
    {
      id: 'export',
      label: 'Export',
      group: 'File',
      keywords: 'png svg drawio download image',
      run: () => shell.open('export'),
    },
    {
      id: 'compare',
      label: 'Compare',
      group: 'File',
      keywords: 'diff version',
      run: () => shell.open('compare'),
    },
    { id: 'undo', label: 'Undo', group: 'Edit', hint: key(COMBO.UNDO), run: undo },
    { id: 'redo', label: 'Redo', group: 'Edit', hint: key(COMBO.REDO), run: redo },
    ...TOOLS.map((tool) => ({
      id: `tool-${tool.id}`,
      label: tool.label,
      group: 'Tools',
      hint: tool.keys[0],
      keywords: tool.hint,
      run: () => canvas.setTool(tool.id),
    })),
    ...SHAPE_OPTIONS.map((option) => ({
      id: `add-${option.value}`,
      label: `Add ${option.label}`,
      group: 'Shapes',
      keywords: `${option.value} ${option.hint}`,
      run: () => canvas.requestShape(option.value),
    })),
    {
      id: 'fit',
      label: 'Zoom to fit',
      group: 'View',
      hint: 'Shift+1',
      run: () => canvas.requestView('fit'),
    },
    {
      id: 'selection',
      label: 'Zoom to selection',
      group: 'View',
      hint: 'Shift+2',
      run: () => canvas.requestView('selection'),
    },
    {
      id: 'tidy',
      label: 'Tidy up',
      group: 'View',
      keywords: 'layout arrange',
      run: () => canvas.requestView('tidy'),
    },
    {
      id: 'lines',
      label: 'Change line style',
      group: 'View',
      keywords: 'step curved straight connections',
      run: cycleLines,
    },
    {
      id: 'snap',
      label: canvas.snap ? 'Turn off snap to grid' : 'Snap to grid',
      group: 'View',
      run: canvas.toggleSnap,
    },
    {
      id: 'minimap',
      label: canvas.minimap ? 'Hide the minimap' : 'Show the minimap',
      group: 'View',
      run: canvas.toggleMinimap,
    },
    {
      id: 'text',
      label: canvas.isTextOpen ? 'Hide the text' : 'Edit as text',
      group: 'View',
      keywords: 'flow source code',
      run: canvas.toggleText,
    },
    {
      id: 'sketch',
      label: 'Sketch style',
      group: 'View',
      keywords: 'hand drawn rough',
      run: toggleSketch,
    },
    {
      id: 'theme',
      label: `Theme: ${themeLabel.value}`,
      group: 'View',
      keywords: 'dark light',
      run: cycleTheme,
    },
    {
      id: 'full-screen',
      label: 'Full screen',
      group: 'View',
      hint: key(COMBO.FULL_SCREEN),
      run: fullScreen.toggle,
    },
    {
      id: 'zen',
      label: 'Zen mode',
      group: 'View',
      hint: key(COMBO.ZEN),
      keywords: 'focus hide',
      run: canvas.toggleZen,
    },
    {
      id: 'help',
      label: 'Keyboard shortcuts',
      group: 'Help',
      hint: key(COMBO.HELP),
      run: () => shell.open('help'),
    },
  ])
}
