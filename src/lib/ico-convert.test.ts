import { afterEach, describe, expect, it, vi } from 'vitest'
import { encodeToIco } from './ico-convert'

vi.mock('./image-codecs', () => ({
  decodeImageFileToPngBlob: vi.fn(),
}))

import { decodeImageFileToPngBlob } from './image-codecs'

describe('encodeToIco', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('wraps the PNG bytes in a single-image ICO container', async () => {
    const pngBytes = new Uint8Array([1, 2, 3, 4])
    const pngBlob = new Blob([pngBytes], { type: 'image/png' })
    vi.mocked(decodeImageFileToPngBlob).mockResolvedValue(pngBlob)
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(() => Promise.resolve({ width: 32, height: 32, close: vi.fn() })),
    )

    const blob = await encodeToIco(new Blob())
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const view = new DataView(bytes.buffer)

    expect(view.getUint16(2, true)).toBe(1) // type = icon
    expect(view.getUint16(4, true)).toBe(1) // 1 image
    expect(bytes[6]).toBe(32) // width
    expect(bytes[7]).toBe(32) // height
    expect(view.getUint32(14, true)).toBe(pngBytes.length)
    expect(view.getUint32(18, true)).toBe(22) // offset = 6-byte header + 16-byte entry
    expect(blob.type).toBe('image/x-icon')
    expect(Array.from(bytes.slice(22))).toEqual(Array.from(pngBytes))
  })

  it('encodes 256px dimensions as 0 per the ICO spec', async () => {
    vi.mocked(decodeImageFileToPngBlob).mockResolvedValue(
      new Blob([new Uint8Array([9])], { type: 'image/png' }),
    )
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(() => Promise.resolve({ width: 256, height: 256, close: vi.fn() })),
    )

    const blob = await encodeToIco(new Blob())
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect(bytes[6]).toBe(0)
    expect(bytes[7]).toBe(0)
  })
})
