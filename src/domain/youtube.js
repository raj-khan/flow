/**
 * The id of a YouTube video, from the id itself or any link to it: watch,
 * youtu.be, embed or shorts.
 * @param {string | undefined} written
 * @returns {string} empty when it names no video
 */
export function youtubeId(written) {
  const text = String(written ?? '').trim()
  if (VIDEO_ID.test(text)) return text
  const found = /(?:[?&]v=|youtu\.be\/|\/embed\/|\/shorts\/)([\w-]{11})(?![\w-])/.exec(text)
  return found ? found[1] : ''
}

const VIDEO_ID = /^[\w-]{11}$/

/**
 * A player that sets no cookies until it is played.
 * @param {string} id
 */
export const youtubeEmbed = (id) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`
