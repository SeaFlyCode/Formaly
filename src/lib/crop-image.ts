import type { Area } from 'react-easy-crop'

export interface FlipState {
  horizontal: boolean
  vertical: boolean
}

export async function cropImageToBlob(
  imageUrl: string,
  cropPixels: Area,
  mimeType: string,
  rotation = 0,
  flip: FlipState = { horizontal: false, vertical: false },
): Promise<Blob> {
  const image = await loadImage(imageUrl)
  const rotRad = getRadianAngle(rotation)
  const { width: boxWidth, height: boxHeight } = rotatedBoxSize(image.width, image.height, rotation)

  const rotatedCanvas = document.createElement('canvas')
  rotatedCanvas.width = boxWidth
  rotatedCanvas.height = boxHeight
  const rotatedCtx = rotatedCanvas.getContext('2d')
  if (!rotatedCtx) throw new Error("Impossible d'initialiser le contexte de rendu")

  rotatedCtx.translate(boxWidth / 2, boxHeight / 2)
  rotatedCtx.rotate(rotRad)
  rotatedCtx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1)
  rotatedCtx.translate(-image.width / 2, -image.height / 2)
  rotatedCtx.drawImage(image, 0, 0)

  const canvas = document.createElement('canvas')
  canvas.width = cropPixels.width
  canvas.height = cropPixels.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error("Impossible d'initialiser le contexte de rendu")

  ctx.drawImage(
    rotatedCanvas,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Rognage échoué'))),
      mimeType,
      mimeType === 'image/jpeg' ? 0.92 : undefined,
    )
  })
}

function getRadianAngle(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function rotatedBoxSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation)
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = url
  })
}
