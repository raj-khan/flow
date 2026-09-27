import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common'

import { CONFIG, type Config } from '../config.js'
import { loadDomain, type FlowDocument } from '../domain.js'
import { DiagramsRepository, type DiagramRow } from './diagrams.repository.js'

const ID_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
/** 14 characters from 56: about 81 bits, so a link cannot be guessed. */
const ID_LENGTH = 14

export interface Published {
  id: string
  revision: number
  url: string
  links: {
    page: string
    markdown: string
    flow: string
    svg: string
    json: string
    embed: string
    oembed: string
  }
}

/** A diagram as it is served: its row, and the document read from it. */
export interface Loaded {
  row: DiagramRow
  document: FlowDocument
}

@Injectable()
export class DiagramsService {
  constructor(
    private readonly diagrams: DiagramsRepository,
    @Inject(CONFIG) private readonly config: Config,
  ) {}

  /** Store a new diagram; the edit token is returned once and kept only as a hash. */
  async publish(text: string): Promise<Published & { editToken: string }> {
    const { canonical, document } = await this.read(text)
    const id = newId()
    const editToken = randomBytes(32).toString('base64url')
    await this.diagrams.insert({
      id,
      text: canonical,
      title: document.title,
      editHash: hash(editToken),
    })
    return { ...this.describe(id, 1), editToken }
  }

  async update(id: string, token: string, text: string): Promise<Published> {
    await this.authorise(id, token)
    const { canonical, document } = await this.read(text)
    const revision = await this.diagrams.update(id, canonical, document.title)
    return this.describe(id, revision)
  }

  async unpublish(id: string, token: string): Promise<void> {
    await this.authorise(id, token)
    await this.diagrams.remove(id)
  }

  async load(id: string): Promise<Loaded> {
    const row = /^[A-Za-z0-9]{1,64}$/.test(id) ? await this.diagrams.find(id) : null
    if (!row) throw new NotFoundException('No diagram at this link. It may have been unpublished.')
    const { parseFlow } = await loadDomain()
    const { document } = parseFlow(row.text)
    // Stored text was valid when written; a parser change must not take a link down.
    return { row, document: document ?? { version: 3, title: row.title, nodes: [], edges: [] } }
  }

  describe(id: string, revision: number): Published {
    const url = `${this.config.publicUrl}/d/${id}`
    return {
      id,
      revision,
      url,
      links: {
        page: url,
        markdown: `${url}.md`,
        flow: `${url}.flow`,
        svg: `${url}.svg`,
        json: `${url}.json`,
        embed: `${url}/embed`,
        oembed: `${this.config.publicUrl}/oembed?url=${encodeURIComponent(url)}`,
      },
    }
  }

  /** Valid .flow text, written back in its canonical form. */
  private async read(text: unknown): Promise<{ canonical: string; document: FlowDocument }> {
    if (typeof text !== 'string' || !text.trim()) {
      throw new UnprocessableEntityException({
        message: 'Send the diagram as .flow text.',
        errors: [],
      })
    }
    if (Buffer.byteLength(text) > this.config.maxBytes) {
      throw new PayloadTooLargeException(`A diagram can be at most ${this.config.maxBytes} bytes.`)
    }
    const { parseFlow, serialiseFlow } = await loadDomain()
    const { document, errors } = parseFlow(text)
    if (!document) {
      throw new UnprocessableEntityException({ message: 'The .flow text has errors.', errors })
    }
    return { canonical: serialiseFlow(document), document }
  }

  private async authorise(id: string, token: string): Promise<void> {
    const row = /^[A-Za-z0-9]{1,64}$/.test(id) ? await this.diagrams.find(id) : null
    if (!row) throw new NotFoundException('No diagram at this link.')
    const given = Buffer.from(hash(token))
    const stored = Buffer.from(row.editHash)
    if (!token || given.length !== stored.length || !timingSafeEqual(given, stored)) {
      throw new ForbiddenException('That edit token does not match this diagram.')
    }
  }
}

const hash = (token: string) => createHash('sha256').update(token).digest('hex')

function newId(): string {
  const bytes = randomBytes(ID_LENGTH * 2)
  let id = ''
  // Rejection sampling, so every character is equally likely.
  for (const byte of bytes) {
    if (byte >= ID_ALPHABET.length * Math.floor(256 / ID_ALPHABET.length)) continue
    id += ID_ALPHABET[byte % ID_ALPHABET.length]
    if (id.length === ID_LENGTH) return id
  }
  return id.length === ID_LENGTH ? id : newId()
}
