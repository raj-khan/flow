<script setup>
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'

import TextField from '@/components/ui/TextField.vue'
import SelectField from '@/components/ui/SelectField.vue'
import { useNode } from '@/composables/useFlowQuery.js'
import { useDeleteNode, useUpdateNode } from '@/composables/useNodeMutations.js'
import { useDraft } from '@/composables/useDraft.js'
import { useFlowHistory } from '@/composables/useFlowHistory.js'
import { useToastStore } from '@/stores/toasts.js'
import { metaFor, SHAPE_OPTIONS } from '@/domain/nodeMeta.js'
import { FIELD_LIMIT, maxLength, required } from '@/domain/validators.js'
import { ROUTE } from '@/router/index.js'
import DrawerHeader from './DrawerHeader.vue'
import DrawerFooter from './DrawerFooter.vue'
import { SHAPE } from '@/domain/constants.js'

const props = defineProps({ id: { type: String, required: true } })

const router = useRouter()
const { node, isLoading } = useNode(() => props.id)
const updateNode = useUpdateNode()
const deleteNode = useDeleteNode()
const toasts = useToastStore()
const { undo } = useFlowHistory()

const meta = computed(() => (node.value ? metaFor(node.value.type) : null))

/** One draft for the whole node, so the footer has a single Save. */
const editable = computed(() =>
  node.value
    ? {
        id: node.value.id,
        name: node.value.name,
        type: node.value.type,
        description: node.value.data.description ?? '',
        notes: node.value.data.notes ?? '',
      }
    : null,
)

const { draft, errors, isValid, isDirty, touch, touchAll, reset } = useDraft(editable, {
  name: [required('Title'), maxLength('Title', FIELD_LIMIT.TITLE_MAX)],
  type: [],
  description: [maxLength('Description', FIELD_LIMIT.DESCRIPTION_MAX)],
  notes: [maxLength('Notes', FIELD_LIMIT.NOTES_MAX)],
})

const shapeOptions = SHAPE_OPTIONS.map(({ value, label }) => ({ value, label }))

const footerError = computed(() =>
  updateNode.isError.value ? 'Could not save. Your changes were rolled back.' : null,
)

const titleField = useTemplateRef('titleField')
const footer = useTemplateRef('footer')

function close() {
  router.push({ name: ROUTE.FLOW })
}

function save() {
  touchAll()
  if (!isValid.value || !isDirty.value) return

  updateNode.mutate(
    {
      id: props.id,
      patch: {
        name: draft.name,
        type: draft.type,
        data: { description: draft.description, notes: draft.notes },
      },
    },
    // The drawer stays open, so this is the only sign the write actually landed.
    { onSuccess: () => toasts.push('Changes saved', { action: { label: 'Undo', run: undo } }) },
  )
}

function remove() {
  deleteNode.mutate(
    { id: props.id },
    {
      onSuccess() {
        close()
        toasts.push('Node deleted', { action: { label: 'Undo', run: undo } })
      },
    },
  )
}

/** @param {KeyboardEvent} event */
function onKeydown(event) {
  if (event.key !== 'Escape') return
  // Back out of the confirmation first, so Escape never deletes by surprise.
  if (footer.value?.confirming) footer.value.cancelConfirm()
  else close()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  // Opening a node usually means editing it, unless typing has already begun
  // elsewhere: a double-click opens the drawer and a title field on the shape.
  const active = document.activeElement
  if (!active || !/^(INPUT|TEXTAREA)$/.test(active.tagName)) {
    titleField.value?.querySelector('input')?.focus()
  }
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <aside
    class="island absolute top-16 right-3 bottom-3 z-20 flex w-[380px] max-w-[calc(100%-1.5rem)] flex-col overflow-hidden"
    role="dialog"
    aria-modal="false"
    :aria-label="meta ? `${meta.label} details` : 'Node details'"
  >
    <DrawerHeader
      :label="meta?.label ?? 'Node'"
      :shape="node?.type ?? ''"
      :accent="meta?.accent ?? 'unknown'"
      :name="node?.name ?? 'Loading'"
      @close="close"
    />

    <div v-if="isLoading" class="p-5 text-sm text-muted" role="status">Loading node</div>

    <div v-else-if="!node" class="p-5" role="alert">
      <p class="text-sm font-medium">This node no longer exists.</p>
      <p class="mt-1 text-xs text-muted">It may have been deleted in another tab.</p>
      <button
        type="button"
        class="mt-4 rounded-lg border border-line px-3 py-1.5 text-sm transition-colors hover:bg-hover"
        title="Return to the flow (Esc)"
        @click="close"
      >
        Back to canvas
      </button>
    </div>

    <template v-else>
      <div class="scroll-panel min-h-0 flex-1 space-y-5 px-5 py-4">
        <div ref="titleField">
          <TextField
            v-model="draft.name"
            label="Title"
            :error="errors.name"
            :maxlength="FIELD_LIMIT.TITLE_MAX"
            @blur="touch('name')"
          />
        </div>

        <TextField
          v-model="draft.description"
          label="Description"
          multiline
          placeholder="What does this step do?"
          :error="errors.description"
          :maxlength="FIELD_LIMIT.DESCRIPTION_MAX"
          @blur="touch('description')"
        />

        <TextField
          v-model="draft.notes"
          label="Notes for the builder"
          multiline
          placeholder="Paginate the list. Writes must be idempotent."
          hint="Instructions for whoever builds this, person or agent. They go with Copy for AI."
          :error="errors.notes"
          :maxlength="FIELD_LIMIT.NOTES_MAX"
          @blur="touch('notes')"
        />

        <!-- A pen stroke is only its line: it cannot become a box. -->
        <SelectField
          v-if="draft.type !== SHAPE.INK"
          v-model="draft.type"
          label="Shape"
          :options="shapeOptions"
        />
      </div>

      <DrawerFooter
        ref="footer"
        :is-dirty="isDirty"
        :is-saving="updateNode.isPending.value"
        :is-deleting="deleteNode.isPending.value"
        :can-delete="meta?.deletable ?? false"
        :error="footerError"
        @save="save"
        @cancel="reset"
        @delete="remove"
      />
    </template>
  </aside>
</template>
