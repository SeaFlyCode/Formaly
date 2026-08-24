import { PDFDocument } from 'pdf-lib'

export type ImageTargetFormat = 'png' | 'jpeg' | 'webp'

export interface ConvertImageRequest {
  type: 'convert-image'
  file: ArrayBuffer
  sourceMimeType: string
  targetFormat: ImageTargetFormat
}

export interface ImageToPdfRequest {
  type: 'image-to-pdf'
  file: ArrayBuffer
  sourceMimeType: string
}

export type ProcessingRequest = ConvertImageRequest | ImageToPdfRequest

export interface ProcessingSuccess {
  type: 'processing-success'
  blob: Blob
}

export interface ProcessingError {
  type: 'processing-error'
  message: string
}

const MIME_BY_FORMAT: Record<ImageTargetFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

async function convertImage(request: ConvertImageRequest): Promise<Blob> {
  const sourceBlob = new Blob([request.file], { type: request.sourceMimeType })
  const bitmap = await createImageBitmap(sourceBlob)

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error("Impossible d'initialiser le contexte de rendu")

  // Un fond blanc évite un rendu noir : le JPEG ne supporte pas la transparence.
  if (request.targetFormat === 'jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()

  return canvas.convertToBlob({
    type: MIME_BY_FORMAT[request.targetFormat],
    quality: request.targetFormat === 'png' ? undefined : 0.92,
  })
}

async function imageToPdf(request: ImageToPdfRequest): Promise<Blob> {
  const pdfDoc = await PDFDocument.create()

  const embeddedImage =
    request.sourceMimeType === 'image/png'
      ? await pdfDoc.embedPng(request.file)
      : await pdfDoc.embedJpg(request.file)

  const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height])
  page.drawImage(embeddedImage, {
    x: 0,
    y: 0,
    width: embeddedImage.width,
    height: embeddedImage.height,
  })

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
}

self.onmessage = async (event: MessageEvent<ProcessingRequest>) => {
  try {
    let blob: Blob

    if (event.data.type === 'convert-image') {
      blob = await convertImage(event.data)
    } else if (event.data.sourceMimeType === 'image/webp') {
      // pdf-lib n'embed que PNG/JPEG : on repasse par le canvas pour convertir le WebP en PNG avant embed.
      const asPng = await convertImage({
        type: 'convert-image',
        file: event.data.file,
        sourceMimeType: event.data.sourceMimeType,
        targetFormat: 'png',
      })
      const pngBuffer = await asPng.arrayBuffer()
      blob = await imageToPdf({ ...event.data, file: pngBuffer, sourceMimeType: 'image/png' })
    } else {
      blob = await imageToPdf(event.data)
    }

    const response: ProcessingSuccess = { type: 'processing-success', blob }
    self.postMessage(response)
  } catch (error) {
    const response: ProcessingError = {
      type: 'processing-error',
      message: error instanceof Error ? error.message : 'Traitement échoué',
    }
    self.postMessage(response)
  }
}
