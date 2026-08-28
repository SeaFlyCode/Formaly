import { describe, expect, it } from 'vitest'
import { detectFileType } from './file-type-detector'

function fileFromBytes(bytes: number[]): File {
  return new File([new Uint8Array(bytes)], 'test')
}

function ftypBrandBytes(brand: string): number[] {
  // ftyp box: 4 bytes size (unused by detector) + 'ftyp' + major brand
  const bytes = [0x00, 0x00, 0x00, 0x18]
  for (const char of 'ftyp') bytes.push(char.charCodeAt(0))
  for (const char of brand) bytes.push(char.charCodeAt(0))
  return bytes
}

describe('detectFileType', () => {
  it('detects PNG from its magic bytes', async () => {
    const file = fileFromBytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    await expect(detectFileType(file)).resolves.toBe('png')
  })

  it('detects JPEG from its magic bytes', async () => {
    const file = fileFromBytes([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
    await expect(detectFileType(file)).resolves.toBe('jpeg')
  })

  it('detects PDF from its magic bytes', async () => {
    const file = fileFromBytes([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37])
    await expect(detectFileType(file)).resolves.toBe('pdf')
  })

  it('detects WebP via RIFF/WEBP container', async () => {
    const bytes = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]
    await expect(detectFileType(fileFromBytes(bytes))).resolves.toBe('webp')
  })

  it('rejects a RIFF container that is not WebP', async () => {
    const bytes = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x20]
    await expect(detectFileType(fileFromBytes(bytes))).resolves.toBeNull()
  })

  it.each(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1'])(
    'detects HEIC for ftyp brand "%s"',
    async (brand) => {
      await expect(detectFileType(fileFromBytes(ftypBrandBytes(brand)))).resolves.toBe('heic')
    },
  )

  it.each(['avif', 'avis'])('detects AVIF for ftyp brand "%s"', async (brand) => {
    await expect(detectFileType(fileFromBytes(ftypBrandBytes(brand)))).resolves.toBe('avif')
  })

  it('rejects an unknown ftyp brand', async () => {
    await expect(detectFileType(fileFromBytes(ftypBrandBytes('xyz1')))).resolves.toBeNull()
  })

  it('detects BMP from its magic bytes', async () => {
    await expect(detectFileType(fileFromBytes([0x42, 0x4d, 0, 0, 0, 0]))).resolves.toBe('bmp')
  })

  it('detects ICO from its magic bytes', async () => {
    await expect(detectFileType(fileFromBytes([0x00, 0x00, 0x01, 0x00, 0x01, 0x00]))).resolves.toBe('ico')
  })

  it('detects GIF from its magic bytes', async () => {
    const bytes = [...'GIF89a'].map((c) => c.charCodeAt(0))
    await expect(detectFileType(fileFromBytes(bytes))).resolves.toBe('gif')
  })

  it.each([
    ['little-endian', [0x49, 0x49, 0x2a, 0x00]],
    ['big-endian', [0x4d, 0x4d, 0x00, 0x2a]],
  ])('detects TIFF from its magic bytes (%s)', async (_label, bytes) => {
    await expect(detectFileType(fileFromBytes(bytes as number[]))).resolves.toBe('tiff')
  })

  it('detects SVG from an XML declaration', async () => {
    const bytes = [...'<?xml version="1.0"?>'].map((c) => c.charCodeAt(0))
    await expect(detectFileType(fileFromBytes(bytes))).resolves.toBe('svg')
  })

  it('detects SVG without an XML declaration', async () => {
    const bytes = [...'<svg xmlns'].map((c) => c.charCodeAt(0))
    await expect(detectFileType(fileFromBytes(bytes))).resolves.toBe('svg')
  })

  it('returns null for unrecognized content', async () => {
    const file = fileFromBytes([0x00, 0x01, 0x02, 0x03, 0x04, 0x05])
    await expect(detectFileType(file)).resolves.toBeNull()
  })

  it('returns null for an empty file', async () => {
    const file = fileFromBytes([])
    await expect(detectFileType(file)).resolves.toBeNull()
  })
})
