import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('heic2any')
})

describe('convertHeicToPng', () => {
  it('returns the blob directly when heic2any resolves a single blob', async () => {
    const blob = new Blob(['png'])
    vi.doMock('heic2any', () => ({ default: vi.fn(() => Promise.resolve(blob)) }))
    const { convertHeicToPng } = await import('./heic-convert')

    const result = await convertHeicToPng(new File(['x'], 'a.heic'))

    expect(result).toBe(blob)
  })

  it('returns the first blob when heic2any resolves an array', async () => {
    const blob = new Blob(['png'])
    vi.doMock('heic2any', () => ({ default: vi.fn(() => Promise.resolve([blob, new Blob(['other'])])) }))
    const { convertHeicToPng } = await import('./heic-convert')

    const result = await convertHeicToPng(new File(['x'], 'a.heic'))

    expect(result).toBe(blob)
  })
})
