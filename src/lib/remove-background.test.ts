import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const segmenter = vi.fn()
const pipeline = vi.fn(
  (_task?: string, _model?: string, _options?: { progress_callback: (data: unknown) => void }) =>
    Promise.resolve(segmenter),
)
const env: { allowLocalModels: boolean } = { allowLocalModels: true }

beforeEach(() => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.doMock('@huggingface/transformers', () => ({ pipeline, env }))
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetModules()
  vi.doUnmock('@huggingface/transformers')
  pipeline.mockClear()
  segmenter.mockReset()
  env.allowLocalModels = true
})

describe('removeBackground', () => {
  it('disables local model lookup and fetches from the HF CDN', async () => {
    const resultBlob = new Blob(['out'])
    segmenter.mockResolvedValue({ toBlob: () => Promise.resolve(resultBlob) })
    const { removeBackground } = await import('./remove-background')

    await removeBackground(new File(['x'], 'a.png'))

    expect(env.allowLocalModels).toBe(false)
  })

  it('resolves with the produced blob and revokes the object URL', async () => {
    const resultBlob = new Blob(['out'])
    segmenter.mockResolvedValue({ toBlob: () => Promise.resolve(resultBlob) })
    const { removeBackground } = await import('./remove-background')

    const result = await removeBackground(new File(['x'], 'a.png'))

    expect(result).toBe(resultBlob)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })

  it('unwraps an array result from the segmenter', async () => {
    const resultBlob = new Blob(['out'])
    segmenter.mockResolvedValue([{ toBlob: () => Promise.resolve(resultBlob) }])
    const { removeBackground } = await import('./remove-background')

    const result = await removeBackground(new File(['x'], 'a.png'))

    expect(result).toBe(resultBlob)
  })

  it('reports download progress and a final processing step', async () => {
    segmenter.mockResolvedValue({ toBlob: () => Promise.resolve(new Blob()) })
    pipeline.mockImplementation((_task, _model, options) => {
      options?.progress_callback({ status: 'progress', progress: 37.6 })
      return Promise.resolve(segmenter)
    })
    const { removeBackground } = await import('./remove-background')
    const onProgress = vi.fn()

    await removeBackground(new File(['x'], 'a.png'), onProgress)

    expect(onProgress).toHaveBeenCalledWith({ status: 'downloading', progress: 38 })
    expect(onProgress).toHaveBeenCalledWith({ status: 'processing', progress: 100 })
  })

  it('ignores non-progress pipeline status updates', async () => {
    segmenter.mockResolvedValue({ toBlob: () => Promise.resolve(new Blob()) })
    pipeline.mockImplementation((_task, _model, options) => {
      options?.progress_callback({ status: 'ready' })
      return Promise.resolve(segmenter)
    })
    const { removeBackground } = await import('./remove-background')
    const onProgress = vi.fn()

    await removeBackground(new File(['x'], 'a.png'), onProgress)

    expect(onProgress).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'downloading' }))
  })

  it('revokes the object URL even when segmentation throws', async () => {
    segmenter.mockRejectedValue(new Error('fail'))
    const { removeBackground } = await import('./remove-background')

    await expect(removeBackground(new File(['x'], 'a.png'))).rejects.toThrow('fail')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })
})
