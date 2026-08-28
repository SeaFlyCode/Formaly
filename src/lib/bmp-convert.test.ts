import { afterEach, describe, expect, it, vi } from 'vitest'
import { encodeToBmp } from './bmp-convert'

vi.mock('./image-codecs', () => ({
  decodeImageFileToImageData: vi.fn(),
}))

import { decodeImageFileToImageData } from './image-codecs'

describe('encodeToBmp', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes a valid BMP header for the decoded dimensions', async () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255])
    vi.mocked(decodeImageFileToImageData).mockResolvedValue({
      data,
      width: 2,
      height: 1,
      colorSpace: 'srgb',
    } as ImageData)

    const blob = await encodeToBmp(new Blob())
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const view = new DataView(bytes.buffer)

    expect(bytes[0]).toBe(0x42) // 'B'
    expect(bytes[1]).toBe(0x4d) // 'M'
    expect(view.getUint32(10, true)).toBe(54) // pixel data offset
    expect(view.getInt32(18, true)).toBe(2) // width
    expect(view.getInt32(22, true)).toBe(1) // height
    expect(view.getUint16(28, true)).toBe(24) // bits per pixel
    expect(blob.type).toBe('image/bmp')
  })

  it('pads each row to a multiple of 4 bytes', async () => {
    // 3px wide, 24bpp row = 9 bytes, padded to 12
    const data = new Uint8ClampedArray(3 * 4).fill(10)
    vi.mocked(decodeImageFileToImageData).mockResolvedValue({
      data,
      width: 3,
      height: 1,
      colorSpace: 'srgb',
    } as ImageData)

    const blob = await encodeToBmp(new Blob())
    expect(blob.size).toBe(54 + 12)
  })
})
