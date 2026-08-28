import { PDFDocument, degrees } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { rotatePdfPages } from './pdf-rotate'

async function makePdfBuffer(pageCount: number, initialRotation = 0): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([50, 50])
    page.setRotation(degrees(initialRotation))
  }
  const bytes = await doc.save()
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

describe('rotatePdfPages', () => {
  it('rotates every page by the given delta', async () => {
    const source = await makePdfBuffer(3)
    const result = await rotatePdfPages(source, 90)
    const outDoc = await PDFDocument.load(await result.arrayBuffer())
    outDoc.getPages().forEach((page) => expect(page.getRotation().angle).toBe(90))
  })

  it('wraps rotation angles into [0, 360)', async () => {
    const source = await makePdfBuffer(1, 270)
    const result = await rotatePdfPages(source, 180)
    const outDoc = await PDFDocument.load(await result.arrayBuffer())
    expect(outDoc.getPages()[0].getRotation().angle).toBe(90)
  })

  it('supports negative deltas', async () => {
    const source = await makePdfBuffer(1, 90)
    const result = await rotatePdfPages(source, -180)
    const outDoc = await PDFDocument.load(await result.arrayBuffer())
    expect(outDoc.getPages()[0].getRotation().angle).toBe(270)
  })

  it('returns a PDF blob', async () => {
    const source = await makePdfBuffer(1)
    const result = await rotatePdfPages(source, 90)
    expect(result.type).toBe('application/pdf')
  })
})
