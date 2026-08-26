import heic2any from 'heic2any'

export async function convertHeicToPng(file: File): Promise<Blob> {
  const result = await heic2any({ blob: file, toType: 'image/png' })
  return Array.isArray(result) ? result[0] : result
}
