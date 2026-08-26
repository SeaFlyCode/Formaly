import { PDFDocument } from 'pdf-lib'

export async function splitPdf(file: ArrayBuffer, pageIndices: number[]): Promise<Blob> {
  const srcDoc = await PDFDocument.load(file)
  const outDoc = await PDFDocument.create()
  const copiedPages = await outDoc.copyPages(srcDoc, pageIndices)
  copiedPages.forEach((page) => outDoc.addPage(page))

  const bytes = await outDoc.save()
  return new Blob([bytes.slice()], { type: 'application/pdf' })
}
