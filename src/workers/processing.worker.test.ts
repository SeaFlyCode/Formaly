import { PDFDocument } from 'pdf-lib'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConvertImageRequest, ImageToPdfRequest, ProcessingSuccess, ProcessingError } from './processing.worker'

class MockOffscreenCanvas {
  width: number
  height: number
  fillStyle = ''
  private ctx = {
    fillStyle: '',
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  }

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }

  getContext() {
    return this.ctx
  }

  convertToBlob(options: { type: string }) {
    const bytes =
      options.type === 'image/png'
        ? Uint8Array.from(atob(ONE_PIXEL_PNG_BASE64), (c) => c.charCodeAt(0))
        : new Uint8Array([1, 2, 3])
    return Promise.resolve(new Blob([bytes], { type: options.type }))
  }
}

// 1x1 transparent PNG, valid enough for pdf-lib's embedPng.
const ONE_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

function stubBrowserApis() {
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(() => Promise.resolve({ width: 20, height: 10, close: vi.fn() })),
  )
  vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas)
  vi.stubGlobal('self', { postMessage: vi.fn() })
}

async function loadWorker() {
  const worker = await import('./processing.worker')
  return worker
}

async function send(data: ConvertImageRequest | ImageToPdfRequest) {
  await self.onmessage!({ data } as MessageEvent)
}

function lastPostedMessage() {
  const calls = vi.mocked(self.postMessage).mock.calls
  return calls[calls.length - 1][0] as ProcessingSuccess | ProcessingError
}

describe('processing.worker', () => {
  beforeEach(() => {
    stubBrowserApis()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('converts an image and posts a success message with a blob of the target mime type', async () => {
    await loadWorker()

    await send({
      type: 'convert-image',
      file: new ArrayBuffer(4),
      sourceMimeType: 'image/png',
      targetFormat: 'jpeg',
    })

    const message = lastPostedMessage()
    expect(message.type).toBe('processing-success')
    expect((message as ProcessingSuccess).blob.type).toBe('image/jpeg')
  })

  it('embeds a PNG source directly into a PDF', async () => {
    await loadWorker()
    const doc = await PDFDocument.create()
    doc.addPage([10, 10])
    const pngBuffer = Uint8Array.from(atob(ONE_PIXEL_PNG_BASE64), (c) => c.charCodeAt(0)).buffer

    await send({
      type: 'image-to-pdf',
      file: pngBuffer,
      sourceMimeType: 'image/png',
    })

    const message = lastPostedMessage()
    expect(message.type).toBe('processing-success')
    expect((message as ProcessingSuccess).blob.type).toBe('application/pdf')
  })

  it('converts WebP to PNG before embedding into a PDF', async () => {
    await loadWorker()

    await send({
      type: 'image-to-pdf',
      file: new ArrayBuffer(4),
      sourceMimeType: 'image/webp',
    })

    const message = lastPostedMessage()
    expect(message.type).toBe('processing-success')
  })

  it('posts a processing-error message with the failure reason', async () => {
    vi.mocked(createImageBitmap).mockRejectedValue(new Error('decode failed'))
    await loadWorker()

    await send({
      type: 'convert-image',
      file: new ArrayBuffer(4),
      sourceMimeType: 'image/png',
      targetFormat: 'png',
    })

    const message = lastPostedMessage()
    expect(message).toEqual({ type: 'processing-error', message: 'decode failed' })
  })

  it('falls back to a generic error message for non-Error throws', async () => {
    vi.mocked(createImageBitmap).mockRejectedValue('nope')
    await loadWorker()

    await send({
      type: 'convert-image',
      file: new ArrayBuffer(4),
      sourceMimeType: 'image/png',
      targetFormat: 'png',
    })

    const message = lastPostedMessage()
    expect(message).toEqual({ type: 'processing-error', message: 'Traitement échoué' })
  })
})
