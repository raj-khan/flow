import { computed, ref } from 'vue'

import { track } from '@/api/analytics.js'
import { STORAGE_KEYS } from '@/api/storageKeys.js'
import { publishDiagram, publishServer, unpublishDiagram, updateDiagram } from '@/api/publishApi.js'
import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { serialiseFlow } from '@/domain/flowText.js'

/**
 * @typedef {{ id: string, url: string, markdown: string, editToken: string }} PublishedLink
 */

/** @returns {PublishedLink | null} */
function saved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PUBLISHED) ?? 'null')
  } catch {
    return null
  }
}

/** @param {PublishedLink | null} link */
function remember(link) {
  try {
    if (link) localStorage.setItem(STORAGE_KEYS.PUBLISHED, JSON.stringify(link))
    else localStorage.removeItem(STORAGE_KEYS.PUBLISHED)
  } catch {
    // A private window refuses storage: the link works, but only this visit can update it.
  }
}

/**
 * A public link for this diagram. The edit token stays in this browser only,
 * so publishing again updates the same link rather than making a new one.
 */
export function usePublish() {
  const { document } = useFlowQuery()
  const link = ref(saved())
  const isBusy = ref(false)
  const error = ref('')
  const isAvailable = computed(() => Boolean(publishServer()))

  /** @param {() => Promise<void>} work */
  async function run(work) {
    isBusy.value = true
    error.value = ''
    try {
      await work()
    } catch (failure) {
      error.value = failure instanceof Error ? failure.message : String(failure)
    } finally {
      isBusy.value = false
    }
  }

  /** Publish, or bring the published copy up to date. */
  const publish = () =>
    run(async () => {
      const text = serialiseFlow(document.value)
      const current = link.value
      if (current) {
        try {
          await updateDiagram(current.id, current.editToken, text)
          track('published')
          return
        } catch (failure) {
          // Unpublished elsewhere, or the server forgot it: publish afresh below.
          if (!/No diagram/.test(String(/** @type {Error} */ (failure)?.message))) throw failure
        }
      }
      const published = await publishDiagram(text)
      link.value = {
        id: published.id,
        url: published.url,
        markdown: published.links.markdown,
        editToken: published.editToken,
      }
      remember(link.value)
      track('published')
    })

  const unpublish = () =>
    run(async () => {
      if (!link.value) return
      await unpublishDiagram(link.value.id, link.value.editToken)
      link.value = null
      remember(null)
    })

  return { link, isAvailable, isBusy, error, publish, unpublish }
}
