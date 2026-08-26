import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resizeImageToBlob } from './resize-image'

function mockImage({ shouldFail = false } = {}) {
  class MockImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    width = 200
    height = 100
    set src(_value: string) {
      queueMicrotask(() => (shouldFail ? this.onerror?.() : this.onload?.()))
    }
  }
  vi.stubGlobal('Image', MockImage)
}

function mockCanvas({ toBlobResult = new Blob(['x']) as Blob | null } = {}) {
  const drawImage = vi.fn()
  const getContext = vi.fn(() => ({ drawImage }))
  const toBlob = vi.fn(
    (callback: (blob: Blob | null) => void, _type?: string, _quality?: number) => {
      callback(toBlobResult)
    },
  )

  const original = HTMLCanvasElement.prototype
  vi.spyOn(original, 'getContext').mockImplementation(getContext as never)
  vi.spyOn(original, 'toBlob').mockImplementation(toBlob as never)

  return { drawImage, getContext, toBlob }
}

describe('resizeImageToBlob', () => {
  beforeEach(() => {
    mockImage()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('sizes the canvas to the requested dimensions', async () => {
    mockCanvas()
    const setWidth = vi.spyOn(HTMLCanvasElement.prototype, 'width', 'set')
    const setHeight = vi.spyOn(HTMLCanvasElement.prototype, 'height', 'set')

    await resizeImageToBlob('data:image/png;base64,x', {
      width: 320,
      height: 240,
      format: 'png',
      quality: 90,
    })

    expect(setWidth).toHaveBeenCalledWith(320)
    expect(setHeight).toHaveBeenCalledWith(240)
  })

  it('requests PNG without a quality argument', async () => {
    const { toBlob } = mockCanvas()

    await resizeImageToBlob('data:image/png;base64,x', {
      width: 10,
      height: 10,
      format: 'png',
      quality: 80,
    })

    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png', undefined)
  })

  it('converts quality 0-100 into 0-1 for lossy formats', async () => {
    const { toBlob } = mockCanvas()

    await resizeImageToBlob('data:image/jpeg;base64,x', {
      width: 10,
      height: 10,
      format: 'jpeg',
      quality: 75,
    })

    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.75)
  })

  it('resolves with the produced blob', async () => {
    const blob = new Blob(['payload'])
    mockCanvas({ toBlobResult: blob })

    const result = await resizeImageToBlob('data:image/webp;base64,x', {
      width: 10,
      height: 10,
      format: 'webp',
      quality: 90,
    })

    expect(result).toBe(blob)
  })

  it('rejects when the canvas fails to produce a blob', async () => {
    mockCanvas({ toBlobResult: null })

    await expect(
      resizeImageToBlob('data:image/png;base64,x', {
        width: 10,
        height: 10,
        format: 'png',
        quality: 90,
      }),
    ).rejects.toThrow('Redimensionnement échoué')
  })

  it('rejects when the image fails to load', async () => {
    vi.unstubAllGlobals()
    mockImage({ shouldFail: true })
    mockCanvas()

    await expect(
      resizeImageToBlob('data:image/png;base64,broken', {
        width: 10,
        height: 10,
        format: 'png',
        quality: 90,
      }),
    ).rejects.toBeUndefined()
  })

  it('throws when the canvas context is unavailable', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    await expect(
      resizeImageToBlob('data:image/png;base64,x', {
        width: 10,
        height: 10,
        format: 'png',
        quality: 90,
      }),
    ).rejects.toThrow("Impossible d'initialiser le contexte de rendu")
  })
})
