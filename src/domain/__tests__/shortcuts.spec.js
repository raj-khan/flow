import { describe, expect, it } from 'vitest'

import { COMBO, SHORTCUT_GROUPS, comboLabel, keyLabel } from '../shortcuts.js'
import { isMacPlatform } from '../platform.js'

describe('shortcuts', () => {
  it('resolves the modifier per platform, showing only one', () => {
    expect(keyLabel('mod', true)).toBe('Cmd')
    expect(keyLabel('mod', false)).toBe('Ctrl')
    expect(keyLabel('Alt', true)).toBe('Option')
    expect(keyLabel('Alt', false)).toBe('Alt')
    expect(comboLabel(COMBO.REDO, true)).toBe('Cmd+Shift+Z')
  })

  it('documents every combination the app binds', () => {
    const documented = SHORTCUT_GROUPS.flatMap((group) =>
      group.shortcuts.flatMap((shortcut) => shortcut.combos.map((combo) => combo.join('+'))),
    )

    for (const combo of Object.values(COMBO)) {
      expect(documented).toContain(combo.join('+'))
    }
  })

  it('treats iPadOS as a Mac, since it wants Cmd too', () => {
    expect(isMacPlatform('MacIntel')).toBe(true)
    expect(isMacPlatform('iPhone')).toBe(true)
    expect(isMacPlatform('Win32')).toBe(false)
    expect(isMacPlatform(undefined)).toBe(false)
  })
})
