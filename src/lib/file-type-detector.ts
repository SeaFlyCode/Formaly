export type DetectedFileType =
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'pdf'
  | 'heic'
  | 'svg'
  | 'avif'
  | 'bmp'
  | 'ico'
  | 'gif'
  | 'tiff'

const HEIC_BRANDS = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']
const AVIF_BRANDS = ['avif', 'avis']

/** Formats normalisés en PNG avant crop/resize/remove-bg/ocr/conversion (comme HEIC). */
export const NORMALIZABLE_TYPES: DetectedFileType[] = ['svg', 'avif', 'bmp', 'ico', 'gif', 'tiff']

export async function detectFileType(file: File): Promise<DetectedFileType | null> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())

  const matches = (offset: number, bytes: number[]) =>
    bytes.every((byte, index) => head[offset + index] === byte)

  const asciiAt = (offset: number, length: number) =>
    String.fromCharCode(...head.slice(offset, offset + length))

  if (matches(0, [0x89, 0x50, 0x4e, 0x47])) return 'png'
  if (matches(0, [0xff, 0xd8, 0xff])) return 'jpeg'
  if (matches(0, [0x25, 0x50, 0x44, 0x46])) return 'pdf'
  if (matches(0, [0x52, 0x49, 0x46, 0x46]) && matches(8, [0x57, 0x45, 0x42, 0x50])) return 'webp'
  if (asciiAt(4, 4) === 'ftyp' && HEIC_BRANDS.includes(asciiAt(8, 4))) return 'heic'
  if (asciiAt(4, 4) === 'ftyp' && AVIF_BRANDS.includes(asciiAt(8, 4))) return 'avif'
  if (matches(0, [0x42, 0x4d])) return 'bmp'
  if (matches(0, [0x00, 0x00, 0x01, 0x00])) return 'ico'
  if (matches(0, [0x47, 0x49, 0x46, 0x38])) return 'gif'
  if (matches(0, [0x49, 0x49, 0x2a, 0x00]) || matches(0, [0x4d, 0x4d, 0x00, 0x2a])) return 'tiff'
  if (isLikelySvg(head)) return 'svg'

  return null
}

function isLikelySvg(head: Uint8Array): boolean {
  const text = String.fromCharCode(...head).trimStart().toLowerCase()
  return text.startsWith('<?xml') || text.startsWith('<svg')
}
