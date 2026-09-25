import { TOOLS } from './tools.js'

/**
 * Every shortcut the app binds, as data, read by the help dialog so what is
 * documented cannot drift from what works.
 *
 * Combos rather than keys, because several bindings have equivalents. `mod` is
 * the platform modifier, rendered as Ctrl or Cmd; the handlers accept either.
 *
 * @typedef {{ combos: string[][], description: string }} Shortcut
 * @typedef {{ title: string, note?: string, shortcuts: Shortcut[] }} ShortcutGroup
 */

/** @type {Readonly<ShortcutGroup[]>} */
export const SHORTCUT_GROUPS = Object.freeze([
  {
    title: 'Canvas',
    shortcuts: [
      { combos: [['↓'], ['→']], description: 'Focus the next shape, in reading order' },
      { combos: [['↑'], ['←']], description: 'Focus the previous shape' },
      { combos: [['Home']], description: 'Focus the first shape' },
      { combos: [['End']], description: 'Focus the last shape' },
      { combos: [['Enter'], ['Space']], description: 'Open the focused shape' },
      { combos: [['F2']], description: 'Rename the focused shape in place' },
      {
        combos: [['double-click']],
        description: 'Rename a shape, or add or edit a connection label, in place',
      },
      { combos: [['Esc']], description: 'Clear the focused shape' },
    ],
  },
  {
    title: 'Tools',
    note: 'The tool bar at the top. Esc goes back to Select and closes the library.',
    shortcuts: TOOLS.map((tool) => ({
      combos: tool.keys.map((key) => [key]),
      description: `${tool.label}: ${tool.hint.charAt(0).toLowerCase()}${tool.hint.slice(1)}`,
    })),
  },
  {
    title: 'View',
    shortcuts: [
      { combos: [['F']], description: 'Full screen, and back' },
      {
        combos: [['Alt', 'Z']],
        description: 'Zen mode: tools hide until the pointer nears an edge',
      },
      { combos: [['Shift', '1']], description: 'Zoom to fit the whole diagram' },
      { combos: [['Shift', '2']], description: 'Zoom to the selection' },
    ],
  },
  {
    title: 'Selection',
    shortcuts: [
      {
        combos: [
          ['Shift', 'click'],
          ['mod', 'click'],
        ],
        description: 'Add a shape to the selection',
      },
      { combos: [['Shift', 'drag']], description: 'Select everything inside a box' },
      { combos: [['mod', 'A']], description: 'Select every shape' },
      {
        combos: [['Delete'], ['Backspace']],
        description: 'Delete the selection, or a selected connection',
      },
      { combos: [['Esc']], description: 'Clear a selection of several shapes' },
      { combos: [['mod', 'C']], description: 'Copy the selection, as .flow text' },
      { combos: [['mod', 'X']], description: 'Cut the selection' },
      {
        combos: [['mod', 'V']],
        description: 'Paste shapes, from this diagram, another tab or any .flow text',
      },
      { combos: [['mod', 'D']], description: 'Duplicate the selection' },
    ],
  },
  {
    title: 'History',
    note: 'Inside a text field these stay with the browser, where they mean text undo.',
    shortcuts: [
      { combos: [['mod', 'Z']], description: 'Undo the last change' },
      {
        combos: [
          ['mod', 'Shift', 'Z'],
          ['mod', 'Y'],
        ],
        description: 'Redo',
      },
    ],
  },
  {
    title: 'File',
    note: 'Save writes back to the file you opened or saved, where the browser allows it.',
    shortcuts: [
      { combos: [['mod', 'O']], description: 'Open a .flow file' },
      { combos: [['mod', 'S']], description: 'Save as a .flow file' },
    ],
  },
  {
    title: 'Node details',
    shortcuts: [
      { combos: [['Esc']], description: 'Close the drawer, or cancel a delete confirmation' },
      { combos: [['Tab']], description: 'Move between fields' },
    ],
  },
  {
    title: 'Dialogs',
    shortcuts: [
      { combos: [['Esc']], description: 'Close' },
      { combos: [['Tab']], description: 'Cycle within the dialog, which keeps focus inside it' },
    ],
  },
  {
    title: 'Help',
    shortcuts: [{ combos: [['?']], description: 'Open this dialog' }],
  },
])

export const HELP_KEY = '?'

/**
 * Only the platform's own modifier is shown: "Ctrl/Cmd+Z" is noise for everyone,
 * and a Mac calls Alt Option.
 * @param {string} key @param {boolean} isMac @returns {string}
 */
export const keyLabel = (key, isMac) => {
  if (key === 'mod') return isMac ? 'Cmd' : 'Ctrl'
  if (key === 'Alt' && isMac) return 'Option'
  return key
}

/** @param {string[]} combo @param {boolean} isMac @returns {string} */
export const comboLabel = (combo, isMac) => combo.map((key) => keyLabel(key, isMac)).join('+')

/** Named, so a tooltip cannot invent a combination the app does not bind. */
export const COMBO = Object.freeze({
  UNDO: ['mod', 'Z'],
  REDO: ['mod', 'Shift', 'Z'],
  HELP: ['?'],
  OPEN: ['mod', 'O'],
  SAVE: ['mod', 'S'],
  FULL_SCREEN: ['F'],
  ZEN: ['Alt', 'Z'],
})
