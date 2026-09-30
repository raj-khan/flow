import { describe, expect, it } from 'vitest'

import {
  DOCUMENT_VERSION,
  edgeIdFor,
  emptyDocument,
  migrate,
  withNothingDrawn,
} from '../document.js'

const v1 = [
  { id: 1, parentId: -1, type: 'trigger', data: {} },
  { id: 'a1', parentId: 1, type: 'sendMessage', name: 'Hello', data: {} },
  {
    id: 'b2',
    parentId: 'a1',
    type: 'addComment',
    name: 'Note',
    data: {},
    position: { x: 4, y: 8 },
  },
  { id: 'c3', parentId: 'ghost', type: 'addComment', name: 'Orphan', data: {} },
]

describe('migrate', () => {
  it('lifts a v1 array: parentId becomes an edge, ids become strings', () => {
    const document = migrate(v1)

    expect(document.version).toBe(DOCUMENT_VERSION)
    expect(document.nodes.map((node) => node.id)).toEqual(['1', 'a1', 'b2', 'c3'])
    expect(document.nodes.every((node) => !('parentId' in node))).toBe(true)
    expect(document.nodes[2].position).toEqual({ x: 4, y: 8 })
    expect(document.edges).toEqual([
      { id: edgeIdFor('1', 'a1'), source: '1', target: 'a1' },
      { id: edgeIdFor('a1', 'b2'), source: 'a1', target: 'b2' },
    ])
  })

  it('keeps a v2 document as it is, and fills in what is missing', () => {
    const document = migrate({
      nodes: [{ id: 7, type: 'addComment' }],
      edges: [{ source: 7, target: 7 }],
    })

    expect(document.title).toBe(emptyDocument().title)
    expect(document.nodes[0].id).toBe('7')
    expect(document.edges[0]).toEqual({ id: edgeIdFor('7', '7'), source: '7', target: '7' })
    expect(migrate(migrate(v1))).toEqual(migrate(v1))
  })

  it('turns the chat-bot types into shapes, keeping what their card showed', () => {
    const document = migrate({
      version: 2,
      nodes: [
        { id: '1', type: 'trigger', data: { type: 'conversationOpened' } },
        {
          id: 'm',
          type: 'sendMessage',
          name: 'Hi',
          data: { payload: [{ type: 'text', text: 'Hello\nthere' }] },
        },
        { id: 'c', type: 'addComment', name: 'Note', data: { comment: 'Remember' } },
        {
          id: 'h',
          type: 'dateTime',
          name: 'Hours',
          data: { times: [{ day: 'mon', startTime: '09:00', endTime: '17:00' }], timezone: 'UTC' },
        },
      ],
      edges: [],
    })
    const byId = Object.fromEntries(document.nodes.map((node) => [node.id, node]))

    expect(byId['1']).toMatchObject({ type: 'terminal', name: 'Start' })
    expect(byId['1'].data.description).toBe('Conversation opened')
    expect(byId.m).toMatchObject({ type: 'process', data: { description: 'Hello' } })
    expect(byId.c).toMatchObject({ type: 'note', data: { description: 'Remember' } })
    expect(byId.h).toMatchObject({ type: 'decision', data: { description: '09:00 - 17:00 - UTC' } })
    // The old fields stay, so nothing is thrown away.
    expect(byId.m.data.payload).toHaveLength(1)
  })

  it('turns a branch node into the label on a direct edge, or into text when it leads nowhere', () => {
    const document = migrate({
      version: 2,
      nodes: [
        { id: 'h', type: 'dateTime', name: 'Hours', data: {} },
        { id: 'yes', type: 'dateTimeConnector', name: 'Success', data: {} },
        { id: 'no', type: 'dateTimeConnector', name: 'Failure', data: {} },
        { id: 'next', type: 'sendMessage', name: 'Next', data: {} },
      ],
      edges: [
        { source: 'h', target: 'yes' },
        { source: 'h', target: 'no' },
        { source: 'yes', target: 'next' },
      ],
    })

    expect(document.nodes.map((node) => node.id)).toEqual(['h', 'no', 'next'])
    expect(document.nodes[1]).toMatchObject({ type: 'text', name: 'Failure' })
    expect(document.edges).toContainEqual({
      id: edgeIdFor('h', 'next'),
      source: 'h',
      target: 'next',
      label: 'Success',
    })
    expect(document.edges.some((edge) => edge.source === 'yes' || edge.target === 'yes')).toBe(
      false,
    )
  })

  it('leaves a current document alone', () => {
    const current = {
      version: DOCUMENT_VERSION,
      title: 'Mine',
      notes: 'Use NestJS',
      nodes: [{ id: 'a', type: 'somethingNew', name: 'A', data: { notes: 'Paginate' } }],
      edges: [],
    }
    expect(migrate(current)).toEqual(current)
  })

  it('refuses anything that is not a document', () => {
    expect(() => migrate('nope')).toThrow(/not an isketch document/i)
    expect(() => migrate({ nodes: 'nope' })).toThrow(/not an isketch document/i)
    expect(() => migrate(null)).toThrow(/not an isketch document/i)
  })
})

describe('withNothingDrawn', () => {
  it('clears every shape and connection, and keeps the rest', () => {
    const doc = {
      version: 3,
      title: 'Shop',
      notes: 'Use Postgres',
      style: /** @type {'sketch'} */ ('sketch'),
      nodes: [{ id: 'a', type: 'process', name: 'A', data: {} }],
      edges: [{ id: 'e', source: 'a', target: 'a' }],
    }
    expect(withNothingDrawn(doc)).toEqual({ ...doc, nodes: [], edges: [] })
  })
})
