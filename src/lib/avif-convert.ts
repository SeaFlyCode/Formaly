import { decodeImageFileToImageData } from './image-codecs'

export async function encodeToAvif(file: File | Blob, quality = 50): Promise<Blob> {
  const { encode } = await import('@jsquash/avif')
  const imageData = await decodeImageFileToImageData(file)
  const avifBuffer = await encode(imageData, { quality })
  return new Blob([avifBuffer], { type: 'image/avif' })
}
