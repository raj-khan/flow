import { describe, expect, it } from 'vitest'

import { PUBLIC_SHELL, serviceWorkerSource, shellFiles } from '../serviceWorker.js'

describe('shellFiles', () => {
  it('lists the build and the public shell once each, without maps or itself', () => {
    const files = shellFiles([
      'index.html',
      'assets/index-abc.js',
      'assets/index-abc.js.map',
      'sw.js',
    ])
    expect(files).toContain('/index.html')
    expect(files).toContain('/assets/index-abc.js')
    expect(files).not.toContain('/assets/index-abc.js.map')
    expect(files).not.toContain('/sw.js')
    for (const file of PUBLIC_SHELL) expect(files).toContain(file)
    expect(new Set(files).size).toBe(files.length)
  })
})

describe('serviceWorkerSource', () => {
  const source = serviceWorkerSource('v1', ['/index.html', '/assets/a.js'])

  it('names its cache after the build, and caches the shell on install', () => {
    expect(source).toContain('const CACHE = "isketch-v1"')
    expect(source).toContain('const SHELL = ["/index.html","/assets/a.js"]')
    expect(source).toContain('cache.addAll(SHELL)')
  })

  it('is valid JavaScript', () => {
    expect(() => new Function(source)).not.toThrow()
  })
})
