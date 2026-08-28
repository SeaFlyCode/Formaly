import { PDFDocument, degrees } from 'pdf-lib'

export async function rotatePdfPages(file: ArrayBuffer, deltaDegrees: number): Promise<Blob> {
  const doc = await PDFDocument.load(file)

  for (const page of doc.getPages()) {
    const current = page.getRotation().angle
    page.setRotation(degrees((((current + deltaDegrees) % 360) + 360) % 360))
  }

  const bytes = await doc.save()
  return new Blob([bytes.slice()], { type: 'application/pdf' })
}
