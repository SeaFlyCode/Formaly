import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'worker-url' }))

function makePage(text: string) {
  return {
    getTextContent: vi.fn(() =>
      Promise.resolve({ items: text.split(' ').map((str) => ({ str })) }),
    ),
  }
}

function makePdf(pageTexts: string[]) {
  const pages = pageTexts.map(makePage)
  return {
    numPages: pages.length,
    getPage: vi.fn((pageNumber: number) => Promise.resolve(pages[pageNumber - 1])),
  }
}

describe('extractPdfText', () => {
  afterEach(() => {
    vi.resetModules()
  })

  it('joins text items on a page and separates pages with a blank line', async () => {
    const pdf = makePdf(['hello world', 'second page'])
    vi.doMock('pdfjs-dist', () => ({
      GlobalWorkerOptions: {},
      getDocument: vi.fn(() => ({ promise: Promise.resolve(pdf) })),
    }))
    const { extractPdfText } = await import('./pdf-extract-text')

    const text = await extractPdfText(new ArrayBuffer(0))

    expect(text).toBe('hello world\n\nsecond page')
  })

  it('ignores non-text marked-content items', async () => {
    const pdf = {
      numPages: 1,
      getPage: vi.fn(() =>
        Promise.resolve({
          getTextContent: vi.fn(() =>
            Promise.resolve({ items: [{ str: 'kept' }, { type: 'beginMarkedContent' }] }),
          ),
        }),
      ),
    }
    vi.doMock('pdfjs-dist', () => ({
      GlobalWorkerOptions: {},
      getDocument: vi.fn(() => ({ promise: Promise.resolve(pdf) })),
    }))
    const { extractPdfText } = await import('./pdf-extract-text')

    await expect(extractPdfText(new ArrayBuffer(0))).resolves.toBe('kept')
  })
})
