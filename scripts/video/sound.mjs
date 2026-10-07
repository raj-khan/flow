/**
 * The demo video's sound, synthesised: no sample files, so nothing to license.
 * A soft pad and a plucked arpeggio under everything, and an effect for each
 * thing that happens on screen, placed at the moment the recording logged it.
 * Written as a 16-bit stereo WAV for ffmpeg to lay under the picture.
 */
import { writeFile } from 'node:fs/promises'

const RATE = 44100

/**
 * @typedef {{ at: number, name: string, until?: number }} Cue
 *   `at` and `until` in milliseconds from the start of the picture
 */

/**
 * @param {Cue[]} cues
 * @param {number} length milliseconds
 * @param {string} path
 */
export async function writeSoundtrack(cues, length, path) {
  const frames = Math.ceil((length / 1000) * RATE)
  const left = new Float32Array(frames)
  const right = new Float32Array(frames)
  const random = seeded(7)

  music(left, right, frames)

  for (const cue of cues) {
    const start = Math.round((cue.at / 1000) * RATE)
    const effect = EFFECTS[cue.name]
    if (!effect) continue
    const until = cue.until === undefined ? undefined : Math.round((cue.until / 1000) * RATE)
    effect({ left, right, start, until, random })
  }

  await writeFile(path, wav(left, right))
}

/** @typedef {{ left: Float32Array, right: Float32Array, start: number, until?: number, random: () => number }} Mix */

/** @type {Record<string, (mix: Mix) => void>} */
const EFFECTS = {
  // A key on a laptop keyboard: a short bright tick, a little different each time.
  key: ({ left, right, start, random }) => {
    const length = 0.018 * RATE
    const tone = 1800 + random() * 900
    let low = 0
    for (let i = 0; i < length; i += 1) {
      const t = i / RATE
      const noise = random() * 2 - 1
      low += 0.35 * (noise - low)
      const value =
        ((noise - low) * 0.5 + Math.sin(2 * Math.PI * tone * t) * 0.3) * Math.exp(-t * 260)
      add(left, right, start + i, value * 0.22, 0.1)
    }
  },

  // A button: a soft, rounded click.
  click: ({ left, right, start, random }) => {
    const length = 0.06 * RATE
    for (let i = 0; i < length; i += 1) {
      const t = i / RATE
      const value =
        (Math.sin(2 * Math.PI * 1400 * t) * 0.6 + (random() * 2 - 1) * 0.25) * Math.exp(-t * 90)
      add(left, right, start + i, value * 0.28, 0)
    }
  },

  // Pen on paper: filtered noise for as long as the stroke lasts, with a grain.
  pen: ({ left, right, start, until, random }) => {
    const end = until ?? start + 0.5 * RATE
    let band = 0
    let low = 0
    let grain = 0
    for (let i = start; i < end; i += 1) {
      const noise = random() * 2 - 1
      low += 0.08 * (noise - low)
      band += 0.5 * (noise - band)
      if (i % 220 === 0) grain = 0.6 + random() * 0.4
      const fade = Math.min(1, (i - start) / (0.03 * RATE), (end - i) / (0.04 * RATE))
      add(left, right, i, (band - low) * grain * fade * 0.11, -0.1)
    }
  },

  // A rough outline snapping clean: a quick rising blip.
  snap: ({ left, right, start }) => {
    const length = 0.16 * RATE
    let phase = 0
    for (let i = 0; i < length; i += 1) {
      const t = i / RATE
      phase += (2 * Math.PI * (520 + 900 * Math.min(1, t / 0.07))) / RATE
      const value = (Math.sin(phase) + 0.3 * Math.sin(2 * phase)) * Math.exp(-t * 28)
      add(left, right, start + i, value * 0.24, 0.05)
    }
  },

  // Two shapes joined: two notes, a fifth apart.
  connect: ({ left, right, start }) => {
    note(left, right, start, 660, 0.18, 0.2, -0.2)
    note(left, right, start + Math.round(0.07 * RATE), 990, 0.22, 0.2, 0.2)
  },

  // Something done: a small bell chord.
  chime: ({ left, right, start }) => {
    note(left, right, start, 1046.5, 0.9, 0.16, -0.3)
    note(left, right, start + Math.round(0.06 * RATE), 1318.5, 0.9, 0.14, 0)
    note(left, right, start + Math.round(0.12 * RATE), 1568, 1.1, 0.14, 0.3)
  },

  // Between scenes: air moving past.
  whoosh: ({ left, right, start, random }) => {
    const length = 0.55 * RATE
    let low = 0
    for (let i = 0; i < length; i += 1) {
      const t = i / length
      const cutoff = 0.02 + 0.25 * Math.sin(Math.PI * t)
      low += cutoff * (random() * 2 - 1 - low)
      const envelope = Math.sin(Math.PI * t) ** 2
      add(left, right, start + i, low * envelope * 0.5, -0.6 + 1.2 * t)
    }
  },

  // The title: a low swell under a bell.
  title: ({ left, right, start }) => {
    const length = 2.4 * RATE
    for (let i = 0; i < length; i += 1) {
      const t = i / RATE
      const envelope = Math.min(1, t / 0.4) * Math.exp(-t * 1.2)
      const value = Math.sin(2 * Math.PI * 65.4 * t) + 0.5 * Math.sin(2 * Math.PI * 130.8 * t)
      add(left, right, start + i, value * envelope * 0.16, 0)
    }
    EFFECTS.chime({ left, right, start: start + Math.round(0.2 * RATE), random: () => 0.5 })
  },
}

/**
 * A soft pad on four chords, with a plucked arpeggio over it, quiet enough to
 * sit under the effects. Fades in and out.
 * @param {Float32Array} left
 * @param {Float32Array} right
 * @param {number} frames
 */
function music(left, right, frames) {
  // C major 7, A minor 7, F major 7, G6: four seconds each.
  const chords = [
    [130.81, 164.81, 196.0, 246.94],
    [110.0, 130.81, 164.81, 196.0],
    [87.31, 130.81, 174.61, 220.0],
    [98.0, 146.83, 196.0, 246.94],
  ]
  const bar = 4 * RATE
  const fade = (i) => Math.min(1, i / (2 * RATE), (frames - i) / (2.5 * RATE))

  for (let i = 0; i < frames; i += 1) {
    const chord = chords[Math.floor(i / bar) % chords.length]
    const inBar = (i % bar) / bar
    // Each chord swells in and out a little, so the changes breathe.
    const swell = 0.75 + 0.25 * Math.sin(Math.PI * inBar)
    const t = i / RATE
    let value = 0
    for (const [index, frequency] of chord.entries()) {
      value += Math.sin(2 * Math.PI * frequency * t + index) * 0.6
      value += Math.sin(2 * Math.PI * frequency * 2.003 * t) * 0.15
    }
    const level = (value / chord.length) * swell * fade(i) * 0.075
    left[i] += level
    right[i] += level
  }

  // Up the chord and back every half second, an octave above the pad.
  const step = Math.round(0.25 * RATE)
  const pattern = [0, 1, 2, 3, 2, 1, 3, 2]
  for (let at = 0, n = 0; at < frames; at += step, n += 1) {
    const chord = chords[Math.floor(at / bar) % chords.length]
    const frequency = chord[pattern[n % pattern.length]] * 4
    const level = 0.045 * fade(at)
    note(left, right, at, frequency, 0.45, level, n % 2 ? 0.35 : -0.35)
  }
}

/**
 * A plucked note that dies away.
 * @param {Float32Array} left
 * @param {Float32Array} right
 * @param {number} start
 * @param {number} frequency
 * @param {number} seconds
 * @param {number} level
 * @param {number} pan -1 left to 1 right
 */
function note(left, right, start, frequency, seconds, level, pan) {
  const length = Math.round(seconds * RATE)
  for (let i = 0; i < length; i += 1) {
    const t = i / RATE
    const value =
      (Math.sin(2 * Math.PI * frequency * t) + 0.25 * Math.sin(2 * Math.PI * frequency * 3 * t)) *
      Math.min(1, t / 0.004) *
      Math.exp((-t * 5) / seconds)
    add(left, right, start + i, value * level, pan)
  }
}

/**
 * @param {Float32Array} left
 * @param {Float32Array} right
 * @param {number} at
 * @param {number} value
 * @param {number} pan
 */
function add(left, right, at, value, pan) {
  if (at < 0 || at >= left.length) return
  left[at] += value * Math.min(1, 1 - pan)
  right[at] += value * Math.min(1, 1 + pan)
}

/** A repeatable random number from 0 to 1. @param {number} seed */
function seeded(seed) {
  let state = seed
  return () => {
    state = (state * 16807) % 2147483647
    return state / 2147483647
  }
}

/**
 * 16-bit PCM, with a gentle limiter so nothing clips.
 * @param {Float32Array} left
 * @param {Float32Array} right
 */
function wav(left, right) {
  const frames = left.length
  const buffer = Buffer.alloc(44 + frames * 4)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + frames * 4, 4)
  buffer.write('WAVEfmt ', 8)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(2, 22)
  buffer.writeUInt32LE(RATE, 24)
  buffer.writeUInt32LE(RATE * 4, 28)
  buffer.writeUInt16LE(4, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(frames * 4, 40)
  for (let i = 0; i < frames; i += 1) {
    buffer.writeInt16LE(Math.round(Math.tanh(left[i] * 1.1) * 30000), 44 + i * 4)
    buffer.writeInt16LE(Math.round(Math.tanh(right[i] * 1.1) * 30000), 46 + i * 4)
  }
  return buffer
}
