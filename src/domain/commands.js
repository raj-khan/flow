/**
 * @typedef {{ id: string, label: string, group: string, hint?: string, keywords?: string, checked?: boolean, disabled?: boolean, run: () => void }} Command
 */

/**
 * The commands a search asks for: every word must appear in the label, group
 * or keywords. Labels that begin with the search come first; otherwise the
 * list keeps its order, so like stays with like.
 *
 * @param {readonly Command[]} commands
 * @param {string} query
 * @returns {Command[]}
 */
export function filterCommands(commands, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return [...commands]

  const found = commands.filter((command) => {
    const text = `${command.label} ${command.group} ${command.keywords ?? ''}`.toLowerCase()
    return words.every((word) => text.includes(word))
  })
  const start = query.trim().toLowerCase()
  const leading = found.filter((command) => command.label.toLowerCase().startsWith(start))
  return [...leading, ...found.filter((command) => !leading.includes(command))]
}
