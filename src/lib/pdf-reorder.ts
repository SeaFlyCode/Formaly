import { PDFDocument } from 'pdf-lib'

export async function reorderPdfPages(file: ArrayBuffer, order: number[]): Promise<Blob> {
  const srcDoc = await PDFDocument.load(file)
  const outDoc = await PDFDocument.create()
  const copiedPages = await outDoc.copyPages(srcDoc, order)
  copiedPages.forEach((page) => outDoc.addPage(page))

  const bytes = await outDoc.save()
  return new Blob([bytes.slice()], { type: 'application/pdf' })
}
