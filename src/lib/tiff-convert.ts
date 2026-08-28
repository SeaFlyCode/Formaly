import * as UTIF from 'utif'
import { decodeImageFileToImageData } from './image-codecs'

export async function decodeTiffToPngBlob(buffer: ArrayBuffer): Promise<Blob> {
  const ifds = UTIF.decode(buffer)
  if (ifds.length === 0) throw new Error('TIFF vide ou illisible')
  UTIF.decodeImage(buffer, ifds[0])
  const rgba = UTIF.toRGBA8(ifds[0])
  const { width, height } = ifds[0]

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D non disponible')
  ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Encodage PNG échoué'))),
      'image/png',
    )
  })
}

export async function encodeToTiff(file: File | Blob): Promise<Blob> {
  const { data, width, height } = await decodeImageFileToImageData(file)
  const tiffBytes = UTIF.encodeImage(new Uint8Array(data), width, height)
  return new Blob([tiffBytes], { type: 'image/tiff' })
}
