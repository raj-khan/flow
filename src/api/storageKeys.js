/** Every key isketch writes to `localStorage`, so a rename happens in one place. */
export const STORAGE_KEYS = Object.freeze({
  DOCUMENT: 'flow:document',
  THEME: 'flow:theme',
  SNAP: 'flow:snap',
  MINIMAP: 'flow:minimap',
  PUBLISHED: 'flow:published',
})

/**
 * Keys written before the product was called Flow, newest first. The document
 * used to be keyed by the URL it was fetched from.
 * @type {Readonly<Record<string, readonly string[]>>}
 */
const LEGACY_KEYS = Object.freeze({
  [STORAGE_KEYS.DOCUMENT]: ['flow-builder:flow:/payload.json', 'flow-builder:flow:/api/payload'],
  [STORAGE_KEYS.THEME]: ['flow-builder:theme'],
})

/**
 * Move anything saved under an old key to its current one, once, so the rename
 * costs nobody a diagram. A current key always wins over a legacy one.
 *
 * @param {Storage} [storage]
 */
export function migrateLegacyKeys(storage = globalThis.localStorage) {
  try {
    Object.entries(LEGACY_KEYS).forEach(([current, legacy]) => {
      const found = legacy.find((key) => storage.getItem(key) !== null)
      if (found && storage.getItem(current) === null) {
        storage.setItem(current, /** @type {string} */ (storage.getItem(found)))
      }
      legacy.forEach((key) => storage.removeItem(key))
    })
  } catch {
    // A private window refuses storage; there is nothing to migrate there.
  }
}
