import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('utif', () => ({
  decode: vi.fn(),
  decodeImage: vi.fn(),
  toRGBA8: vi.fn(),
  encodeImage: vi.fn(),
}))
vi.mock('./image-codecs', () => ({
  decodeImageFileToImageData: vi.fn(),
}))

import * as UTIF from 'utif'
import { decodeImageFileToImageData } from './image-codecs'
import { decodeTiffToPngBlob, encodeToTiff } from './tiff-convert'

function mockCanvas({ toBlobResult = new Blob(['x'], { type: 'image/png' }) as Blob | null } = {}) {
  const putImageData = vi.fn()
  const getContext = vi.fn(() => ({ putImageData }))
  const toBlob = vi.fn((callback: (blob: Blob | null) => void) => callback(toBlobResult))
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(getContext as never)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(toBlob as never)
  return { putImageData }
}

class MockImageData {
  data: Uint8ClampedArray
  width: number
  height: number
  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data
    this.width = width
    this.height = height
  }
}

describe('decodeTiffToPngBlob', () => {
  beforeEach(() => {
    vi.stubGlobal('ImageData', MockImageData)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('decodes the first IFD and produces a PNG blob', async () => {
    const ifd = { width: 4, height: 2 }
    vi.mocked(UTIF.decode).mockReturnValue([ifd] as never)
    vi.mocked(UTIF.toRGBA8).mockReturnValue(new Uint8Array(4 * 2 * 4))
    const { putImageData } = mockCanvas()

    const blob = await decodeTiffToPngBlob(new ArrayBuffer(8))

    expect(UTIF.decodeImage).toHaveBeenCalledWith(expect.anything(), ifd)
    expect(putImageData).toHaveBeenCalled()
    expect(blob.type).toBe('image/png')
  })

  it('throws when the TIFF has no image directory', async () => {
    vi.mocked(UTIF.decode).mockReturnValue([] as never)

    await expect(decodeTiffToPngBlob(new ArrayBuffer(8))).rejects.toThrow(/vide|illisible/)
  })
})

describe('encodeToTiff', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('encodes the decoded image data via UTIF', async () => {
    const data = new Uint8ClampedArray([1, 2, 3, 4])
    vi.mocked(decodeImageFileToImageData).mockResolvedValue({ data, width: 1, height: 1 } as ImageData)
    vi.mocked(UTIF.encodeImage).mockReturnValue(new ArrayBuffer(10))

    const blob = await encodeToTiff(new Blob())

    expect(UTIF.encodeImage).toHaveBeenCalledWith(expect.any(Uint8Array), 1, 1)
    expect(blob.type).toBe('image/tiff')
  })
})
