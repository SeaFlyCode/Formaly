import { afterEach, describe, expect, it } from 'vitest'
import { checkBrowserSupport } from './check-browser-support'

describe('checkBrowserSupport', () => {
  const originalWebAssembly = globalThis.WebAssembly

  afterEach(() => {
    Object.defineProperty(globalThis, 'WebAssembly', {
      value: originalWebAssembly,
      configurable: true,
      writable: true,
    })
  })

  it('reports supported when WebAssembly is available', () => {
    expect(checkBrowserSupport()).toEqual({ supported: true, message: '' })
  })

  it('reports unsupported when WebAssembly is missing', () => {
    Object.defineProperty(globalThis, 'WebAssembly', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    const status = checkBrowserSupport()
    expect(status.supported).toBe(false)
    expect(status.message).toContain('WebAssembly')
  })
})
