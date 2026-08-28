import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./image-codecs', () => ({
  decodeImageFileToImageData: vi.fn(),
}))

describe('encodeToAvif', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('decodes the source and encodes it via @jsquash/avif with the given quality', async () => {
    const imageData = { data: new Uint8ClampedArray(4), width: 1, height: 1 } as ImageData
    const encode = vi.fn(() => Promise.resolve(new ArrayBuffer(12)))
    vi.doMock('@jsquash/avif', () => ({ encode }))

    const { decodeImageFileToImageData } = await import('./image-codecs')
    vi.mocked(decodeImageFileToImageData).mockResolvedValue(imageData)

    const { encodeToAvif } = await import('./avif-convert')
    const blob = await encodeToAvif(new Blob(), 42)

    expect(encode).toHaveBeenCalledWith(imageData, { quality: 42 })
    expect(blob.type).toBe('image/avif')
  })

  it('defaults to a quality of 50 when none is given', async () => {
    const imageData = { data: new Uint8ClampedArray(4), width: 1, height: 1 } as ImageData
    const encode = vi.fn(() => Promise.resolve(new ArrayBuffer(4)))
    vi.doMock('@jsquash/avif', () => ({ encode }))

    const { decodeImageFileToImageData } = await import('./image-codecs')
    vi.mocked(decodeImageFileToImageData).mockResolvedValue(imageData)

    const { encodeToAvif } = await import('./avif-convert')
    await encodeToAvif(new Blob())

    expect(encode).toHaveBeenCalledWith(imageData, { quality: 50 })
  })
})
