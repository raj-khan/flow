/**
 * Editing text in place, injected so a shape or an edge can offer it without
 * owning a mutation each. One thing is edited at a time, named by its id.
 *
 * @typedef {{
 *   editingId: import('vue').Ref<string>,
 *   caretAtEnd: import('vue').Ref<boolean>,
 *   takeTyped: () => { text: string, enter: boolean },
 *   start: (id: string) => void,
 *   stop: () => void,
 *   renameNode: (id: string, name: string) => void,
 *   relabelEdge: (id: string, label: string) => void,
 * }} EditContext
 */

/** @type {import('vue').InjectionKey<EditContext>} */
export const EDIT_TEXT = Symbol('edit-text')
