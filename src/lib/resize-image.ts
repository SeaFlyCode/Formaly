export type ResizeOutputFormat = 'png' | 'jpeg' | 'webp'

interface ResizeOptions {
  width: number
  height: number
  format: ResizeOutputFormat
  quality: number
}

const MIME_BY_FORMAT: Record<ResizeOutputFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

export async function resizeImageToBlob(imageUrl: string, options: ResizeOptions): Promise<Blob> {
  const image = await loadImage(imageUrl)
  const canvas = document.createElement('canvas')
  canvas.width = options.width
  canvas.height = options.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error("Impossible d'initialiser le contexte de rendu")

  ctx.drawImage(image, 0, 0, options.width, options.height)

  const mimeType = MIME_BY_FORMAT[options.format]

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Redimensionnement échoué'))),
      mimeType,
      options.format === 'png' ? undefined : options.quality / 100,
    )
  })
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = url
  })
}
