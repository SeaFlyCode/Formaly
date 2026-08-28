import { decodeImageFileToImageData } from './image-codecs'

export async function encodeToBmp(file: File | Blob): Promise<Blob> {
  const { data, width, height } = await decodeImageFileToImageData(file)
  const rowSize = Math.ceil((width * 3) / 4) * 4
  const pixelArraySize = rowSize * height
  const fileSize = 54 + pixelArraySize

  const buffer = new ArrayBuffer(fileSize)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  bytes[0] = 0x42 // 'B'
  bytes[1] = 0x4d // 'M'
  view.setUint32(2, fileSize, true)
  view.setUint32(6, 0, true)
  view.setUint32(10, 54, true) // pixel data offset

  view.setUint32(14, 40, true) // DIB header size (BITMAPINFOHEADER)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true)
  view.setUint16(26, 1, true) // color planes
  view.setUint16(28, 24, true) // bits per pixel
  view.setUint32(30, 0, true) // no compression
  view.setUint32(34, pixelArraySize, true)
  view.setInt32(38, 2835, true) // ~72 DPI
  view.setInt32(42, 2835, true)
  view.setUint32(46, 0, true)
  view.setUint32(50, 0, true)

  let offset = 54
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      bytes[offset++] = data[i + 2] // B
      bytes[offset++] = data[i + 1] // G
      bytes[offset++] = data[i] // R
    }
    offset += rowSize - width * 3 // row padding
  }

  return new Blob([buffer], { type: 'image/bmp' })
}
