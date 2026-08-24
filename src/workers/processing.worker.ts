export type ImageTargetFormat = 'png' | 'jpeg'

export interface ConvertImageRequest {
  type: 'convert-image'
  file: ArrayBuffer
  sourceMimeType: string
  targetFormat: ImageTargetFormat
}

export interface ConvertImageSuccess {
  type: 'convert-image-success'
  blob: Blob
}

export interface ConvertImageError {
  type: 'convert-image-error'
  message: string
}

const MIME_BY_FORMAT: Record<ImageTargetFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
}

self.onmessage = async (event: MessageEvent<ConvertImageRequest>) => {
  const { file, sourceMimeType, targetFormat } = event.data

  try {
    const sourceBlob = new Blob([file], { type: sourceMimeType })
    const bitmap = await createImageBitmap(sourceBlob)

    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error("Impossible d'initialiser le contexte de rendu")

    // Un fond blanc évite un rendu noir : le JPEG ne supporte pas la transparence.
    if (targetFormat === 'jpeg') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()

    const resultBlob = await canvas.convertToBlob({
      type: MIME_BY_FORMAT[targetFormat],
      quality: targetFormat === 'jpeg' ? 0.92 : undefined,
    })

    const response: ConvertImageSuccess = { type: 'convert-image-success', blob: resultBlob }
    self.postMessage(response)
  } catch (error) {
    const response: ConvertImageError = {
      type: 'convert-image-error',
      message: error instanceof Error ? error.message : 'Conversion échouée',
    }
    self.postMessage(response)
  }
}
