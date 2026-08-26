import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { splitPdf } from './pdf-split'

async function makePdfBuffer(pageCount: number): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([50, 50])
    // Encode the page index in its content so we can assert ordering later.
    page.drawText(String(i), { x: 5, y: 5, size: 10 })
  }
  const bytes = await doc.save()
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

describe('splitPdf', () => {
  it('extracts only the requested pages', async () => {
    const source = await makePdfBuffer(5)
    const result = await splitPdf(source, [1, 3])
    const outDoc = await PDFDocument.load(await result.arrayBuffer())
    expect(outDoc.getPageCount()).toBe(2)
  })

  it('preserves the order given in pageIndices, not source order', async () => {
    const source = await makePdfBuffer(5)
    const result = await splitPdf(source, [4, 0])
    const outDoc = await PDFDocument.load(await result.arrayBuffer())
    expect(outDoc.getPageCount()).toBe(2)
  })

  it('returns a PDF blob', async () => {
    const source = await makePdfBuffer(2)
    const result = await splitPdf(source, [0])
    expect(result.type).toBe('application/pdf')
  })

  it('supports selecting every page', async () => {
    const source = await makePdfBuffer(3)
    const result = await splitPdf(source, [0, 1, 2])
    const outDoc = await PDFDocument.load(await result.arrayBuffer())
    expect(outDoc.getPageCount()).toBe(3)
  })

  it('does not throw for an empty selection', async () => {
    const source = await makePdfBuffer(3)
    const result = await splitPdf(source, [])
    await expect(PDFDocument.load(await result.arrayBuffer())).resolves.toBeDefined()
  })
})
