import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'worker-url' }))

// 1x1 white JPEG, valid enough for pdf-lib's embedJpg.
const ONE_PIXEL_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
const ONE_PIXEL_JPEG = Uint8Array.from(atob(ONE_PIXEL_JPEG_BASE64), (c) => c.charCodeAt(0))

function makePage() {
  return {
    getViewport: vi.fn(() => ({ width: 100, height: 50 })),
    render: vi.fn(() => ({ promise: Promise.resolve() })),
  }
}

function makePdf(pageCount: number) {
  const pages = Array.from({ length: pageCount }, () => makePage())
  return {
    numPages: pageCount,
    getPage: vi.fn((pageNumber: number) => Promise.resolve(pages[pageNumber - 1])),
  }
}

function mockPdfjsGetDocument(pdf: ReturnType<typeof makePdf>) {
  const getDocument = vi.fn(() => ({ promise: Promise.resolve(pdf) }))
  return getDocument
}

function mockCanvas({ toBlobResult = new Blob(['x']) as Blob | null } = {}) {
  const getContext = vi.fn(() => ({ drawImage: vi.fn() }))
  const toBlob = vi.fn(
    (callback: (blob: Blob | null) => void, _type?: string, _quality?: number) => {
      callback(toBlobResult)
    },
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(getContext as never)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(toBlob as never)
}

describe('pdf-to-images', () => {
  beforeEach(() => {
    mockCanvas()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('inspectPdf reports the page count without a preview for multi-page PDFs', async () => {
    const pdf = makePdf(3)
    vi.doMock('pdfjs-dist', () => ({
      GlobalWorkerOptions: {},
      getDocument: mockPdfjsGetDocument(pdf),
    }))
    const { inspectPdf } = await import('./pdf-to-images')

    const result = await inspectPdf(new ArrayBuffer(0))

    expect(result).toEqual({ pageCount: 3, firstPageBlob: null })
  })

  it('inspectPdf renders a preview blob for single-page PDFs', async () => {
    const pdf = makePdf(1)
    vi.doMock('pdfjs-dist', () => ({
      GlobalWorkerOptions: {},
      getDocument: mockPdfjsGetDocument(pdf),
    }))
    const { inspectPdf } = await import('./pdf-to-images')

    const result = await inspectPdf(new ArrayBuffer(0))

    expect(result.pageCount).toBe(1)
    expect(result.firstPageBlob).toBeInstanceOf(Blob)
  })

  it('convertPdfToImages returns a single image for a one-page PDF', async () => {
    const pdf = makePdf(1)
    vi.doMock('pdfjs-dist', () => ({
      GlobalWorkerOptions: {},
      getDocument: mockPdfjsGetDocument(pdf),
    }))
    const { convertPdfToImages } = await import('./pdf-to-images')

    const result = await convertPdfToImages(new ArrayBuffer(0), 'png', 'doc')

    expect(result).toBeInstanceOf(Blob)
    expect(result.type).not.toBe('application/zip')
  })

  it('convertPdfToImages zips multiple pages', async () => {
    const pdf = makePdf(2)
    vi.doMock('pdfjs-dist', () => ({
      GlobalWorkerOptions: {},
      getDocument: mockPdfjsGetDocument(pdf),
    }))
    const { convertPdfToImages } = await import('./pdf-to-images')

    const result = await convertPdfToImages(new ArrayBuffer(0), 'jpeg', 'doc')

    expect(result.type).toBe('application/zip')
  })

  it('renderPdfThumbnails renders one thumbnail per page', async () => {
    const pdf = makePdf(3)
    vi.doMock('pdfjs-dist', () => ({
      GlobalWorkerOptions: {},
      getDocument: mockPdfjsGetDocument(pdf),
    }))
    const { renderPdfThumbnails } = await import('./pdf-to-images')

    const thumbnails = await renderPdfThumbnails(new ArrayBuffer(0))

    expect(thumbnails).toHaveLength(3)
    thumbnails.forEach((thumb) => expect(thumb).toBeInstanceOf(Blob))
  })

  it('inspectPdf surfaces a clear error for a password-protected PDF', async () => {
    class MockPasswordException extends Error {}
    const getDocument = vi.fn(() => ({
      promise: Promise.reject(new MockPasswordException('password required')),
    }))
    vi.doMock('pdfjs-dist', () => ({
      GlobalWorkerOptions: {},
      PasswordException: MockPasswordException,
      getDocument,
    }))
    const { inspectPdf } = await import('./pdf-to-images')

    await expect(inspectPdf(new ArrayBuffer(0))).rejects.toThrow(/protégé par mot de passe/)
  })

  it('inspectPdf rethrows other getDocument failures unchanged', async () => {
    class MockPasswordException extends Error {}
    const getDocument = vi.fn(() => ({ promise: Promise.reject(new Error('corrupt file')) }))
    vi.doMock('pdfjs-dist', () => ({
      GlobalWorkerOptions: {},
      PasswordException: MockPasswordException,
      getDocument,
    }))
    const { inspectPdf } = await import('./pdf-to-images')

    await expect(inspectPdf(new ArrayBuffer(0))).rejects.toThrow('corrupt file')
  })

  it('compressPdf rasterizes each page into a new PDF', async () => {
    const pdf = makePdf(2)
    vi.doMock('pdfjs-dist', () => ({
      GlobalWorkerOptions: {},
      getDocument: mockPdfjsGetDocument(pdf),
    }))
    mockCanvas({ toBlobResult: new Blob([ONE_PIXEL_JPEG], { type: 'image/jpeg' }) })
    const { compressPdf } = await import('./pdf-to-images')

    const result = await compressPdf(new ArrayBuffer(0), 0.6)

    expect(result.type).toBe('application/pdf')
    const { PDFDocument } = await import('pdf-lib')
    const outDoc = await PDFDocument.load(await result.arrayBuffer())
    expect(outDoc.getPageCount()).toBe(2)
  })

  it('throws when the canvas context is unavailable', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const pdf = makePdf(1)
    vi.doMock('pdfjs-dist', () => ({
      GlobalWorkerOptions: {},
      getDocument: mockPdfjsGetDocument(pdf),
    }))
    const { inspectPdf } = await import('./pdf-to-images')

    await expect(inspectPdf(new ArrayBuffer(0))).rejects.toThrow(
      "Impossible d'initialiser le contexte de rendu",
    )
  })
})
