import { PDFDocument } from 'pdf-lib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { watermarkImage, watermarkPdf } from './watermark'

async function makePdfBuffer(pageCount: number): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) doc.addPage([200, 200])
  const bytes = await doc.save()
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

describe('watermarkPdf', () => {
  it('draws the text on every page and keeps the page count', async () => {
    const source = await makePdfBuffer(3)
    const result = await watermarkPdf(source, { text: 'CONFIDENTIEL', opacity: 0.3 })

    const outDoc = await PDFDocument.load(await result.arrayBuffer())
    expect(outDoc.getPageCount()).toBe(3)
    expect(result.type).toBe('application/pdf')
  })
})

function mockImage() {
  class MockImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    naturalWidth = 40
    naturalHeight = 30
    set src(_value: string) {
      queueMicrotask(() => this.onload?.())
    }
  }
  vi.stubGlobal('Image', MockImage)
}

function mockCanvas({ toBlobResult = new Blob(['x'], { type: 'image/png' }) as Blob | null } = {}) {
  const drawImage = vi.fn()
  const fillText = vi.fn()
  const getContext = vi.fn(() => ({
    drawImage,
    fillText,
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    set globalAlpha(_v: number) {},
    set fillStyle(_v: string) {},
    set font(_v: string) {},
    set textAlign(_v: string) {},
    set textBaseline(_v: string) {},
  }))
  const toBlob = vi.fn((callback: (blob: Blob | null) => void) => callback(toBlobResult))
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(getContext as never)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(toBlob as never)
  return { drawImage, fillText }
}

describe('watermarkImage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('draws the image and the watermark text onto a canvas and returns a PNG blob', async () => {
    mockImage()
    const { drawImage, fillText } = mockCanvas()

    const blob = await watermarkImage('blob:mock', { text: 'DRAFT', opacity: 0.4 })

    expect(drawImage).toHaveBeenCalled()
    expect(fillText).toHaveBeenCalledWith('DRAFT', 0, 0)
    expect(blob.type).toBe('image/png')
  })

  it('rejects when the image fails to load', async () => {
    class FailingImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        queueMicrotask(() => this.onerror?.())
      }
    }
    vi.stubGlobal('Image', FailingImage)

    await expect(watermarkImage('blob:mock', { text: 'DRAFT', opacity: 0.4 })).rejects.toThrow(
      /image/i,
    )
  })
})
