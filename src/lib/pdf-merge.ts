import { PDFDocument } from 'pdf-lib'

export async function mergePdfs(files: File[]): Promise<Blob> {
  const outDoc = await PDFDocument.create()

  for (const file of files) {
    const buffer = await file.arrayBuffer()
    const srcDoc = await PDFDocument.load(buffer)
    const pages = await outDoc.copyPages(srcDoc, srcDoc.getPageIndices())
    pages.forEach((page) => outDoc.addPage(page))
  }

  const bytes = await outDoc.save()
  return new Blob([bytes.slice()], { type: 'application/pdf' })
}
