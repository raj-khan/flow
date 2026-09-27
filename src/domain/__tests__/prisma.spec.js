import { describe, expect, it } from 'vitest'

import { fromPrisma } from '../prisma.js'

const SCHEMA = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  USER
  ADMIN
}

model User {
  id      Int      @id @default(autoincrement())
  email   String   @unique // who they are
  role    Role     @default(USER)
  posts   Post[]
  groups  Group[]
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  author   User   @relation(fields: [authorId], references: [id])
  authorId Int
  tag      Tagg
}

model Group {
  id      Int    @id
  members User[]
}

model Like {
  userId Int
  postId Int
  post   Post @relation(fields: [postId], references: [id])
  @@id([userId, postId])
}
`

describe('fromPrisma', () => {
  const { document, warnings } = fromPrisma(SCHEMA)
  const byId = Object.fromEntries(document.nodes.map((node) => [node.id, node]))

  it('makes each model a table listing its fields, keys marked', () => {
    expect(document.nodes.map((node) => node.id)).toEqual(['User', 'Post', 'Group', 'Like'])
    expect(byId.User).toMatchObject({ type: 'table', name: 'User' })
    expect(byId.User.data.description).toBe('id PK, email, role')
    expect(byId.Post.data.description).toBe('id PK, title, authorId FK, tag')
    expect(byId.Like.data.description).toBe('userId PK, postId PK FK')
  })

  it('makes a relation with a key an edge to what it points at, labelled with the key', () => {
    expect(document.edges).toContainEqual(
      expect.objectContaining({ source: 'Post', target: 'User', label: 'authorId' }),
    )
    expect(document.edges).toContainEqual(
      expect.objectContaining({ source: 'Like', target: 'Post', label: 'postId' }),
    )
  })

  it('makes a list on both sides one two-way edge, and adds nothing for a back relation', () => {
    const between = document.edges.filter((edge) => [edge.source, edge.target].includes('Group'))
    expect(between).toEqual([expect.objectContaining({ label: 'many to many', both: true })])
    expect(document.edges).toHaveLength(3)
  })

  it('says which field types it does not know', () => {
    expect(warnings).toEqual([
      { line: 25, message: 'Post.tag is a Tagg, which is not defined here.' },
    ])
  })

  it('refuses text with no models', () => {
    expect(fromPrisma('generator client {}').document).toBeNull()
  })
})
