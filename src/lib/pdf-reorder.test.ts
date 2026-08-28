import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { reorderPdfPages } from './pdf-reorder'

async function makePdfBuffer(pageCount: number): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([50, 50])
    page.drawText(String(i), { x: 5, y: 5, size: 10 })
  }
  const bytes = await doc.save()
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

describe('reorderPdfPages', () => {
  it('preserves the page count', async () => {
    const source = await makePdfBuffer(4)
    const result = await reorderPdfPages(source, [3, 2, 1, 0])
    const outDoc = await PDFDocument.load(await result.arrayBuffer())
    expect(outDoc.getPageCount()).toBe(4)
  })

  it('applies the given order', async () => {
    const source = await makePdfBuffer(3)
    const result = await reorderPdfPages(source, [2, 0, 1])
    const outDoc = await PDFDocument.load(await result.arrayBuffer())
    expect(outDoc.getPageIndices()).toEqual([0, 1, 2])
  })

  it('returns a PDF blob', async () => {
    const source = await makePdfBuffer(2)
    const result = await reorderPdfPages(source, [1, 0])
    expect(result.type).toBe('application/pdf')
  })
})
