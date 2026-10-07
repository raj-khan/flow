import { describe, expect, it } from 'vitest'

import { youtubeId } from '../youtube.js'

describe('youtubeId', () => {
  it('reads the id from the id or any kind of link', () => {
    for (const written of [
      'dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=4',
      'https://youtu.be/dQw4w9WgXcQ?si=abc',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://youtube.com/shorts/dQw4w9WgXcQ',
    ]) {
      expect(youtubeId(written)).toBe('dQw4w9WgXcQ')
    }
  })

  it('is empty when nothing names a video', () => {
    expect(youtubeId('')).toBe('')
    expect(youtubeId(undefined)).toBe('')
    expect(youtubeId('https://example.com/watch')).toBe('')
  })
})
