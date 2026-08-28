import { decodeImageFileToPngBlob } from './image-codecs'

const ICO_HEADER_SIZE = 6
const ICO_ENTRY_SIZE = 16

export async function encodeToIco(file: File | Blob): Promise<Blob> {
  const pngBlob = await decodeImageFileToPngBlob(file)
  const pngBytes = new Uint8Array(await pngBlob.arrayBuffer())
  const bitmap = await createImageBitmap(pngBlob)
  const width = bitmap.width
  const height = bitmap.height
  bitmap.close()

  const header = new ArrayBuffer(ICO_HEADER_SIZE)
  const headerView = new DataView(header)
  headerView.setUint16(0, 0, true) // reserved
  headerView.setUint16(2, 1, true) // type = icon
  headerView.setUint16(4, 1, true) // 1 image

  const entry = new ArrayBuffer(ICO_ENTRY_SIZE)
  const entryView = new DataView(entry)
  const entryBytes = new Uint8Array(entry)
  entryBytes[0] = width < 256 ? width : 0 // 0 means 256px
  entryBytes[1] = height < 256 ? height : 0
  entryBytes[2] = 0 // color palette
  entryBytes[3] = 0 // reserved
  entryView.setUint16(4, 1, true) // color planes
  entryView.setUint16(6, 32, true) // bits per pixel
  entryView.setUint32(8, pngBytes.length, true) // size of image data
  entryView.setUint32(12, ICO_HEADER_SIZE + ICO_ENTRY_SIZE, true) // offset

  return new Blob([header, entry, pngBytes], { type: 'image/x-icon' })
}
