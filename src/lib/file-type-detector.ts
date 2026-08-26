export type DetectedFileType = 'png' | 'jpeg' | 'webp' | 'pdf' | 'heic'

const HEIC_BRANDS = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']

export async function detectFileType(file: File): Promise<DetectedFileType | null> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer())

  const matches = (offset: number, bytes: number[]) =>
    bytes.every((byte, index) => head[offset + index] === byte)

  const asciiAt = (offset: number, length: number) =>
    String.fromCharCode(...head.slice(offset, offset + length))

  if (matches(0, [0x89, 0x50, 0x4e, 0x47])) return 'png'
  if (matches(0, [0xff, 0xd8, 0xff])) return 'jpeg'
  if (matches(0, [0x25, 0x50, 0x44, 0x46])) return 'pdf'
  if (matches(0, [0x52, 0x49, 0x46, 0x46]) && matches(8, [0x57, 0x45, 0x42, 0x50])) return 'webp'
  if (asciiAt(4, 4) === 'ftyp' && HEIC_BRANDS.includes(asciiAt(8, 4))) return 'heic'

  return null
}
