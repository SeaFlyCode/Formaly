import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const recognize = vi.fn()
const terminate = vi.fn()
const worker = { recognize, terminate }
type Logger = (data: { status: string; progress: number }) => void
const createWorker = vi.fn(
  (_lang?: string, _oem?: unknown, _options?: { logger: Logger }) => Promise.resolve(worker),
)

beforeEach(() => {
  vi.doMock('tesseract.js', () => ({ createWorker }))
})

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('tesseract.js')
  createWorker.mockClear()
  recognize.mockReset()
  terminate.mockReset()
})

describe('extractText', () => {
  it('resolves with the recognized text', async () => {
    recognize.mockResolvedValue({ data: { text: 'hello world' } })
    const { extractText } = await import('./ocr')

    const result = await extractText('data:image/png;base64,x')

    expect(result).toBe('hello world')
  })

  it('creates the worker with the French+English language pack', async () => {
    recognize.mockResolvedValue({ data: { text: '' } })
    const { extractText } = await import('./ocr')

    await extractText('data:image/png;base64,x')

    expect(createWorker).toHaveBeenCalledWith('fra+eng', undefined, expect.any(Object))
  })

  it('terminates the worker after recognition', async () => {
    recognize.mockResolvedValue({ data: { text: '' } })
    const { extractText } = await import('./ocr')

    await extractText('data:image/png;base64,x')

    expect(terminate).toHaveBeenCalled()
  })

  it('terminates the worker even when recognition fails', async () => {
    recognize.mockRejectedValue(new Error('fail'))
    const { extractText } = await import('./ocr')

    await expect(extractText('data:image/png;base64,x')).rejects.toThrow('fail')
    expect(terminate).toHaveBeenCalled()
  })

  it('reports rounded progress during text recognition', async () => {
    recognize.mockResolvedValue({ data: { text: '' } })
    createWorker.mockImplementation((_lang, _oem, options) => {
      options?.logger({ status: 'recognizing text', progress: 0.426 })
      return Promise.resolve(worker)
    })
    const { extractText } = await import('./ocr')
    const onProgress = vi.fn()

    await extractText('data:image/png;base64,x', onProgress)

    expect(onProgress).toHaveBeenCalledWith(43)
  })

  it('ignores non-recognition logger statuses', async () => {
    recognize.mockResolvedValue({ data: { text: '' } })
    createWorker.mockImplementation((_lang, _oem, options) => {
      options?.logger({ status: 'loading language traineddata', progress: 1 })
      return Promise.resolve(worker)
    })
    const { extractText } = await import('./ocr')
    const onProgress = vi.fn()

    await extractText('data:image/png;base64,x', onProgress)

    expect(onProgress).not.toHaveBeenCalled()
  })
})
