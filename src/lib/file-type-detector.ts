export type DetectedImageType = 'png' | 'jpeg'

const SIGNATURES: { type: DetectedImageType; bytes: number[] }[] = [
  { type: 'png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { type: 'jpeg', bytes: [0xff, 0xd8, 0xff] },
]

export async function detectImageType(file: File): Promise<DetectedImageType | null> {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer())

  for (const signature of SIGNATURES) {
    if (signature.bytes.every((byte, index) => head[index] === byte)) {
      return signature.type
    }
  }

  return null
}
