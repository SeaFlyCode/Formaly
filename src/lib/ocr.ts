/**
 * Extracts text from an image entirely in the browser.
 *
 * Uses tesseract.js (Apache-2.0), which runs the Tesseract OCR engine via
 * WebAssembly. Language traineddata (French + English) is streamed lazily
 * from tesseract.js's CDN at runtime and is never bundled with the app.
 */
export async function extractText(
  imageUrl: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const { createWorker } = await import('tesseract.js')

  const worker = await createWorker('fra+eng', undefined, {
    logger: (data) => {
      if (data.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(data.progress * 100))
      }
    },
  })

  try {
    const {
      data: { text },
    } = await worker.recognize(imageUrl)
    return text
  } finally {
    await worker.terminate()
  }
}
