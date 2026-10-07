<script setup>
import { computed, nextTick, ref } from 'vue'

import { STORAGE_KEYS } from '@/api/storageKeys.js'
import { useCanvasStore } from '@/stores/canvas.js'

/**
 * Everything that is not drawing, in view at the left: File, Agent, View and
 * Help, each folding away, the whole panel folding to a rail of icons. It
 * lists commands by id and runs them, so the menu, Ctrl+K and this panel
 * cannot drift apart. The selection's colours and alignment teleport into
 * `#dock-selection` while the panel is open.
 */
const props = defineProps({
  commands: {
    type: /** @type {import('vue').PropType<import('@/domain/commands.js').Command[]>} */ (Array),
    required: true,
  },
  /** Extra Help rows the shell owns, such as the command palette. */
  help: {
    type: /** @type {import('vue').PropType<{ id: string, label: string, title: string, hint?: string, run: () => void }[]>} */ (
      Array
    ),
    default: () => [],
  },
})

const canvas = useCanvasStore()

/**
 * Each row names a command, the label it goes by here, and what it does.
 * @type {{ id: string, title: string, tip: string, icon: string, rows: [string, string, string][] }[]}
 */
const SECTIONS = [
  {
    id: 'file',
    title: 'File',
    tip: 'New, open, save, import and export',
    icon: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6',
    rows: [
      ['new', 'New diagram', 'Start on a blank canvas; undo brings this one back'],
      ['new-sample', 'New from a sample', 'Start from one of the sample diagrams'],
      ['open', 'Open file', 'Open a .flow file from your computer or repository'],
      ['save', 'Save', 'Save to the open file, or download a .flow file'],
      [
        'import',
        'Import',
        'Mermaid, draw.io, Excalidraw, compose, OpenAPI, SQL, Prisma or Drizzle',
      ],
      ['export', 'Export', 'PNG, SVG, draw.io or Excalidraw'],
      ['compare', 'Compare', 'See what changed against a file or another version'],
      ['discard', 'Discard all', 'Clear every shape and connection; undo brings them back'],
    ],
  },
  {
    id: 'agent',
    title: 'Agent',
    tip: 'Copy for AI, share, draft, and the .flow text',
    icon: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
    rows: [
      ['copy-brief', 'Copy for AI', 'Copy a brief and a link to paste into your coding agent'],
      ['share', 'Share', 'Copy a link that carries the whole diagram'],
      ['draft', 'Draft with your agent', 'Describe a diagram in words and let your agent draw it'],
      ['text', 'Edit as text', 'Show the .flow text beside the canvas'],
    ],
  },
  {
    id: 'view',
    title: 'View',
    tip: 'Sketch style, theme, lines, grid and zoom',
    icon: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    rows: [
      ['sketch', 'Sketch style', 'Draw the whole diagram by hand, like a whiteboard'],
      ['theme', '', 'Switch between system, light and dark'],
      ['lines', 'Line style', 'Run connections in steps, curves or straight'],
      ['snap', 'Snap to grid', 'Dragged shapes snap to the dots'],
      ['minimap', 'Minimap', 'A small map of the whole diagram, bottom right'],
      ['tidy', 'Tidy up', 'Lay out the whole diagram; undo puts it back'],
      ['fit', 'Zoom to fit', 'Show the whole diagram'],
      ['zen', 'Zen mode', 'Hide every tool until the pointer nears an edge'],
      ['full-screen', 'Full screen', 'Fill the screen with the canvas'],
    ],
  },
]

const HELP_ICON =
  'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 0 1 4.9.7c0 1.8-2.4 2.3-2.4 3.8M12 17h.01'
const SELECTION_ICON = 'M4 4h6v6H4zM14 14h6v6h-6zM14 4h6v6h-6z'

const byId = computed(() => new Map(props.commands.map((command) => [command.id, command])))

const sections = computed(() =>
  SECTIONS.map((section) => ({
    ...section,
    items: section.rows
      .map(([id, label, tip]) => {
        const command = byId.value.get(id)
        return command && { ...command, tip, label: label || command.label.replace(/^Theme: /, '') }
      })
      .filter((item) => item !== undefined),
  })),
)

/** Sections folded shut, kept in this browser. */
const folded = ref(readFolded())

function readFolded() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.DOCK_FOLDED) ?? '[]'))
  } catch {
    return new Set()
  }
}

/** @param {string} id */
function toggleSection(id) {
  const next = new Set(folded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  folded.value = next
  try {
    localStorage.setItem(STORAGE_KEYS.DOCK_FOLDED, JSON.stringify([...next]))
  } catch {
    // A private window refuses storage; the folds hold until reload.
  }
}

/**
 * From the rail: open the panel on that section, unfolded.
 * @param {string} id
 */
async function openAt(id) {
  if (folded.value.has(id)) toggleSection(id)
  if (!canvas.dockOpen) canvas.toggleDock()
  await nextTick()
  document.getElementById(`dock-${id}`)?.scrollIntoView({ block: 'nearest' })
}
</script>

<template>
  <aside
    class="absolute inset-y-0 left-0 z-20 flex flex-col border-r border-line bg-surface pt-16"
    :class="canvas.dockOpen ? 'w-[232px]' : 'w-[52px]'"
    :aria-label="canvas.dockOpen ? 'Side panel' : 'Side panel, folded'"
    data-testid="side-dock"
  >
    <template v-if="canvas.dockOpen">
      <div class="scroll-panel min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <!-- The selection's colours and alignment teleport in here. -->
        <section id="dock-selection" class="empty:hidden" aria-label="Selection" />
        <section
          v-for="section in sections"
          :id="`dock-${section.id}`"
          :key="section.id"
          class="border-b border-line py-1 last:border-b-0"
        >
          <h2>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase hover:bg-hover"
              :aria-expanded="!folded.has(section.id)"
              :title="`${folded.has(section.id) ? 'Show' : 'Fold'} the ${section.title.toLowerCase()} actions`"
              @click="toggleSection(section.id)"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                aria-hidden="true"
                class="transition-transform"
                :class="{ '-rotate-90': folded.has(section.id) }"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
              {{ section.title }}
            </button>
          </h2>
          <ul v-if="!folded.has(section.id)" class="pb-1">
            <li v-for="item in section.items" :key="item.id">
              <button
                type="button"
                class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-hover disabled:opacity-40 disabled:hover:bg-transparent"
                :class="item.id === 'discard' ? 'text-danger' : 'text-ink'"
                :disabled="item.disabled"
                :aria-pressed="item.checked === undefined ? undefined : item.checked"
                :title="item.tip"
                @click="item.run()"
              >
                <span class="flex-1 truncate">{{ item.label }}</span>
                <span v-if="item.checked" class="text-xs text-ink" aria-hidden="true">✓</span>
                <kbd v-else-if="item.hint" class="font-mono text-[10px] text-subtle">{{
                  item.hint
                }}</kbd>
              </button>
            </li>
          </ul>
        </section>

        <section id="dock-help" class="py-1">
          <h2>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase hover:bg-hover"
              :aria-expanded="!folded.has('help')"
              :title="`${folded.has('help') ? 'Show' : 'Fold'} the help`"
              @click="toggleSection('help')"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                aria-hidden="true"
                class="transition-transform"
                :class="{ '-rotate-90': folded.has('help') }"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
              Help
            </button>
          </h2>
          <ul v-if="!folded.has('help')" class="pb-1">
            <li v-for="item in help" :key="item.id">
              <button
                type="button"
                class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-ink hover:bg-hover"
                :title="item.title"
                @click="item.run()"
              >
                <span class="flex-1 truncate">{{ item.label }}</span>
                <kbd v-if="item.hint" class="font-mono text-[10px] text-subtle">{{
                  item.hint
                }}</kbd>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </template>

    <nav
      v-else
      class="flex flex-1 flex-col items-center gap-1 py-1"
      aria-label="Side panel sections"
    >
      <button
        v-for="section in [
          ...SECTIONS.map(({ id, title, tip, icon }) => ({ id, title, tip, icon })),
          {
            id: 'selection',
            title: 'Selection',
            tip: 'Colour, align and distribute the selection',
            icon: SELECTION_ICON,
          },
          {
            id: 'help',
            title: 'Help',
            tip: 'Shortcuts, commands and the tutorial',
            icon: HELP_ICON,
          },
        ]"
        :key="section.id"
        type="button"
        class="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-ink"
        :aria-label="section.title"
        :title="`${section.title}: ${section.tip}`"
        @click="openAt(section.id)"
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path :d="section.icon" />
        </svg>
      </button>
    </nav>

    <div class="border-t border-line p-2" :class="canvas.dockOpen ? '' : 'flex justify-center'">
      <button
        type="button"
        class="flex h-8 items-center gap-2 rounded-lg px-2 text-xs text-muted hover:bg-hover hover:text-ink"
        :aria-label="canvas.dockOpen ? 'Fold the side panel' : 'Open the side panel'"
        :title="
          canvas.dockOpen ? 'Fold the side panel to icons' : 'Show every action, with its name'
        "
        :aria-expanded="canvas.dockOpen"
        @click="canvas.toggleDock"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
          :class="{ 'rotate-180': !canvas.dockOpen }"
        >
          <path d="m11 17-5-5 5-5M18 17l-5-5 5-5" />
        </svg>
        <span v-if="canvas.dockOpen">Fold</span>
      </button>
    </div>
  </aside>
</template>
