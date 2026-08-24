export interface RemoveBackgroundProgress {
  status: 'downloading' | 'processing'
  progress: number
}

/**
 * Removes the background of an image entirely in the browser.
 *
 * Uses @huggingface/transformers (Apache-2.0) running the ORMBG model
 * (onnx-community/ormbg-ONNX, Apache-2.0 — converted from schirrmacher/ormbg,
 * also Apache-2.0). Both the runtime and the model weights are permissively
 * licensed. Weights are streamed lazily from the Hugging Face CDN at runtime
 * and are never bundled with the app.
 */
export async function removeBackground(
  file: File,
  onProgress?: (progress: RemoveBackgroundProgress) => void,
): Promise<Blob> {
  const { pipeline, env } = await import('@huggingface/transformers')

  // Never look for models on a local server — always fetch from the HF CDN.
  env.allowLocalModels = false

  const segmenter = await pipeline('background-removal', 'onnx-community/ormbg-ONNX', {
    progress_callback: (data: { status: string; progress?: number }) => {
      if (data.status === 'progress' && onProgress) {
        onProgress({ status: 'downloading', progress: Math.round(data.progress ?? 0) })
      }
    },
  })

  onProgress?.({ status: 'processing', progress: 100 })

  const url = URL.createObjectURL(file)
  try {
    const output = await segmenter(url)
    const result = Array.isArray(output) ? output[0] : output
    return await result.toBlob()
  } finally {
    URL.revokeObjectURL(url)
  }
}
