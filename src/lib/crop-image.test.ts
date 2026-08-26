import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cropImageToBlob } from './crop-image'

function mockImage() {
  class MockImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    width = 200
    height = 100
    set src(_value: string) {
      queueMicrotask(() => this.onload?.())
    }
  }
  vi.stubGlobal('Image', MockImage)
}

function mockCanvas({ toBlobResult = new Blob(['x']) as Blob | null } = {}) {
  const translate = vi.fn()
  const rotate = vi.fn()
  const scale = vi.fn()
  const drawImage = vi.fn()
  const getContext = vi.fn(() => ({ translate, rotate, scale, drawImage }))
  const toBlob = vi.fn(
    (callback: (blob: Blob | null) => void, _type?: string, _quality?: number) => {
      callback(toBlobResult)
    },
  )

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(getContext as never)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(toBlob as never)

  return { translate, rotate, scale, drawImage, toBlob }
}

const cropPixels = { x: 5, y: 5, width: 40, height: 30 }

describe('cropImageToBlob', () => {
  beforeEach(() => {
    mockImage()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('draws the cropped region onto the output canvas', async () => {
    const { drawImage } = mockCanvas()

    await cropImageToBlob('data:image/png;base64,x', cropPixels, 'image/png')

    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      cropPixels.x,
      cropPixels.y,
      cropPixels.width,
      cropPixels.height,
      0,
      0,
      cropPixels.width,
      cropPixels.height,
    )
  })

  it('applies rotation to the intermediate canvas', async () => {
    const { rotate } = mockCanvas()

    await cropImageToBlob('data:image/png;base64,x', cropPixels, 'image/png', 90)

    expect(rotate).toHaveBeenCalledWith(Math.PI / 2)
  })

  it('applies horizontal and vertical flip via canvas scale', async () => {
    const { scale } = mockCanvas()

    await cropImageToBlob('data:image/png;base64,x', cropPixels, 'image/png', 0, {
      horizontal: true,
      vertical: true,
    })

    expect(scale).toHaveBeenCalledWith(-1, -1)
  })

  it('does not flip by default', async () => {
    const { scale } = mockCanvas()

    await cropImageToBlob('data:image/png;base64,x', cropPixels, 'image/png')

    expect(scale).toHaveBeenCalledWith(1, 1)
  })

  it('uses JPEG quality 0.92 only for JPEG output', async () => {
    const { toBlob } = mockCanvas()

    await cropImageToBlob('data:image/png;base64,x', cropPixels, 'image/jpeg')

    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.92)
  })

  it('omits quality for non-JPEG output', async () => {
    const { toBlob } = mockCanvas()

    await cropImageToBlob('data:image/png;base64,x', cropPixels, 'image/png')

    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png', undefined)
  })

  it('resolves with the produced blob', async () => {
    const blob = new Blob(['payload'])
    mockCanvas({ toBlobResult: blob })

    const result = await cropImageToBlob('data:image/png;base64,x', cropPixels, 'image/png')

    expect(result).toBe(blob)
  })

  it('rejects when the canvas fails to produce a blob', async () => {
    mockCanvas({ toBlobResult: null })

    await expect(
      cropImageToBlob('data:image/png;base64,x', cropPixels, 'image/png'),
    ).rejects.toThrow('Rognage échoué')
  })

  it('throws when the canvas context is unavailable', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    await expect(
      cropImageToBlob('data:image/png;base64,x', cropPixels, 'image/png'),
    ).rejects.toThrow("Impossible d'initialiser le contexte de rendu")
  })
})
