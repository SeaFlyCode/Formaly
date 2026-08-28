import { afterEach, describe, expect, it, vi } from 'vitest'
import { decodeImageFileToImageData, decodeImageFileToPngBlob } from './image-codecs'

function stubBitmap(width = 4, height = 3) {
  const close = vi.fn()
  vi.stubGlobal('createImageBitmap', vi.fn(() => Promise.resolve({ width, height, close })))
  return close
}

function mockCanvas({
  toBlobResult = new Blob(['x'], { type: 'image/png' }) as Blob | null,
  imageData = {} as ImageData,
} = {}) {
  const drawImage = vi.fn()
  const getImageData = vi.fn(() => imageData)
  const getContext = vi.fn(() => ({ drawImage, getImageData }))
  const toBlob = vi.fn((callback: (blob: Blob | null) => void) => callback(toBlobResult))
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(getContext as never)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(toBlob as never)
  return { drawImage, getImageData, toBlob }
}

describe('decodeImageFileToImageData', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('draws the decoded bitmap onto a canvas sized to match it and reads back pixel data', async () => {
    const close = stubBitmap(4, 3)
    const imageData = { width: 4, height: 3 } as ImageData
    const { drawImage, getImageData } = mockCanvas({ imageData })

    const result = await decodeImageFileToImageData(new Blob())

    expect(drawImage).toHaveBeenCalled()
    expect(getImageData).toHaveBeenCalledWith(0, 0, 4, 3)
    expect(close).toHaveBeenCalled()
    expect(result).toBe(imageData)
  })
})

describe('decodeImageFileToPngBlob', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('resolves with the canvas-encoded PNG blob', async () => {
    stubBitmap()
    const pngBlob = new Blob(['png'], { type: 'image/png' })
    mockCanvas({ toBlobResult: pngBlob })

    await expect(decodeImageFileToPngBlob(new Blob())).resolves.toBe(pngBlob)
  })

  it('rejects when canvas encoding fails', async () => {
    stubBitmap()
    mockCanvas({ toBlobResult: null })

    await expect(decodeImageFileToPngBlob(new Blob())).rejects.toThrow(/PNG/)
  })
})
