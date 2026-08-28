import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { zipSync, type Zippable } from 'fflate'
import { PDFDocument } from 'pdf-lib'
import type { ImageTargetFormat } from '../workers/processing.worker'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

const MIME_BY_FORMAT: Record<ImageTargetFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

const EXTENSION_BY_FORMAT: Record<ImageTargetFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
}

async function renderPageToBlob(
  page: pdfjsLib.PDFPageProxy,
  targetFormat: ImageTargetFormat,
  quality = 0.92,
  scale = 2,
): Promise<Blob> {
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error("Impossible d'initialiser le contexte de rendu")

  await page.render({ canvas, canvasContext: ctx, viewport }).promise

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Rendu de page échoué'))),
      MIME_BY_FORMAT[targetFormat],
      targetFormat === 'png' ? undefined : quality,
    )
  })
}

export async function renderPdfThumbnails(file: ArrayBuffer): Promise<Blob[]> {
  const pdf = await pdfjsLib.getDocument({ data: file }).promise
  const thumbnails: Blob[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 0.35 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error("Impossible d'initialiser le contexte de rendu")

    await page.render({ canvas, canvasContext: ctx, viewport }).promise

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Rendu de miniature échoué'))),
        'image/jpeg',
        0.75,
      )
    })
    thumbnails.push(blob)
  }

  return thumbnails
}

export async function inspectPdf(
  file: ArrayBuffer,
): Promise<{ pageCount: number; firstPageBlob: Blob | null }> {
  let pdf
  try {
    pdf = await pdfjsLib.getDocument({ data: file }).promise
  } catch (err) {
    if (err instanceof pdfjsLib.PasswordException) {
      throw new Error('Ce PDF est protégé par mot de passe — non pris en charge pour le moment.')
    }
    throw err
  }

  if (pdf.numPages !== 1) return { pageCount: pdf.numPages, firstPageBlob: null }

  const page = await pdf.getPage(1)
  const firstPageBlob = await renderPageToBlob(page, 'png')
  return { pageCount: 1, firstPageBlob }
}

export async function compressPdf(file: ArrayBuffer, quality: number, scale = 1.5): Promise<Blob> {
  const pdf = await pdfjsLib.getDocument({ data: file }).promise
  const outDoc = await PDFDocument.create()

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale })
    const blob = await renderPageToBlob(page, 'jpeg', quality, scale)
    const jpgBytes = new Uint8Array(await blob.arrayBuffer())
    const jpgImage = await outDoc.embedJpg(jpgBytes)
    const outPage = outDoc.addPage([viewport.width, viewport.height])
    outPage.drawImage(jpgImage, { x: 0, y: 0, width: viewport.width, height: viewport.height })
  }

  const bytes = await outDoc.save()
  return new Blob([bytes.slice()], { type: 'application/pdf' })
}

export async function convertPdfToImages(
  file: ArrayBuffer,
  targetFormat: ImageTargetFormat,
  baseName: string,
): Promise<Blob> {
  const pdf = await pdfjsLib.getDocument({ data: file }).promise
  const extension = EXTENSION_BY_FORMAT[targetFormat]

  if (pdf.numPages === 1) {
    const page = await pdf.getPage(1)
    return renderPageToBlob(page, targetFormat)
  }

  const entries: Zippable = {}
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const blob = await renderPageToBlob(page, targetFormat)
    const buffer = await blob.arrayBuffer()
    const paddedIndex = String(pageNumber).padStart(2, '0')
    entries[`${baseName}-page-${paddedIndex}.${extension}`] = new Uint8Array(buffer)
  }

  const zipped = zipSync(entries)
  return new Blob([zipped], { type: 'application/zip' })
}
