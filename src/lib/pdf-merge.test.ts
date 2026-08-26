import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { mergePdfs } from './pdf-merge'

async function makePdfFile(name: string, pageCount: number): Promise<File> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) doc.addPage([50, 50])
  const bytes = await doc.save()
  return new File([bytes.slice()], name, { type: 'application/pdf' })
}

describe('mergePdfs', () => {
  it('concatenates pages from all files in order', async () => {
    const a = await makePdfFile('a.pdf', 2)
    const b = await makePdfFile('b.pdf', 3)

    const merged = await mergePdfs([a, b])
    const mergedDoc = await PDFDocument.load(await merged.arrayBuffer())

    expect(mergedDoc.getPageCount()).toBe(5)
  })

  it('returns a PDF blob', async () => {
    const a = await makePdfFile('a.pdf', 1)
    const merged = await mergePdfs([a])
    expect(merged.type).toBe('application/pdf')
  })

  it('does not throw when given no files', async () => {
    const merged = await mergePdfs([])
    await expect(PDFDocument.load(await merged.arrayBuffer())).resolves.toBeDefined()
  })

  it('handles a single-file merge as a passthrough of its pages', async () => {
    const a = await makePdfFile('a.pdf', 4)
    const merged = await mergePdfs([a])
    const mergedDoc = await PDFDocument.load(await merged.arrayBuffer())
    expect(mergedDoc.getPageCount()).toBe(4)
  })
})
