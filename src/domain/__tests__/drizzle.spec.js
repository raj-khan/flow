import { describe, expect, it } from 'vitest'

import { fromDrizzle } from '../drizzle.js'

const SCHEMA = `import { integer, pgTable, primaryKey, serial, text, foreignKey } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// People who sign in.
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  bio: text('bio', { length: 280 }),
})

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  authorId: integer('author_id').references(() => users.id, { onDelete: 'cascade' }),
})

export const likes = pgTable(
  'likes',
  {
    userId: integer('user_id').notNull(),
    postId: integer('post_id').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.postId] }),
    foreignKey({ columns: [t.postId], foreignColumns: [posts.id] }),
  ],
)

export const comments = pgTable('comments', {
  id: serial().primaryKey(),
  postId: integer('post_id'),
  tagId: integer('tag_id').references(() => tags.id),
})

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
}))
`

describe('fromDrizzle', () => {
  const { document, warnings } = fromDrizzle(SCHEMA)
  const byId = Object.fromEntries(document.nodes.map((node) => [node.id, node]))

  it('makes each table a table shape, named as in the database, with its columns', () => {
    expect(document.nodes.map((node) => node.id)).toEqual(['users', 'posts', 'likes', 'comments'])
    expect(byId.users).toMatchObject({ type: 'table', name: 'users' })
    expect(byId.users.data.description).toBe('id PK, email, bio')
    expect(byId.posts.data.description).toBe('id PK, title, author_id FK')
    expect(byId.likes.data.description).toBe('user_id PK, post_id PK FK')
    expect(byId.comments.data.description).toBe('id PK, post_id FK, tag_id')
  })

  it('makes references, foreign keys and relations edges, labelled with the column', () => {
    expect(
      document.edges.map(({ source, target, label }) => `${source}->${target}:${label}`),
    ).toEqual(['posts->users:author_id', 'likes->posts:post_id', 'comments->posts:post_id'])
  })

  it('says which references point at tables it does not have', () => {
    expect(warnings).toEqual([
      expect.objectContaining({
        message: 'comments.tagId refers to tags, which is not defined here.',
      }),
    ])
  })

  it('refuses text with no tables', () => {
    expect(fromDrizzle('const x = 1').document).toBeNull()
  })
})
