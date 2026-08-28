import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'

export interface WatermarkOptions {
  text: string
  opacity: number
  fontSize?: number
  rotationDeg?: number
}

export async function watermarkPdf(file: ArrayBuffer, options: WatermarkOptions): Promise<Blob> {
  const { text, opacity, fontSize = 48, rotationDeg = -45 } = options
  const doc = await PDFDocument.load(file)
  const font = await doc.embedFont(StandardFonts.HelveticaBold)
  const textWidth = font.widthOfTextAtSize(text, fontSize)

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize()
    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity,
      rotate: degrees(rotationDeg),
    })
  }

  const bytes = await doc.save()
  return new Blob([bytes.slice()], { type: 'application/pdf' })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Chargement de l'image échoué"))
    image.src = src
  })
}

export async function watermarkImage(imageUrl: string, options: WatermarkOptions): Promise<Blob> {
  const { text, opacity, rotationDeg = -45 } = options
  const image = await loadImage(imageUrl)

  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D non disponible')

  ctx.drawImage(image, 0, 0)

  const fontSize = options.fontSize ?? Math.round(canvas.width / 10)
  ctx.save()
  ctx.globalAlpha = opacity
  ctx.fillStyle = '#808080'
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((rotationDeg * Math.PI) / 180)
  ctx.fillText(text, 0, 0)
  ctx.restore()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Encodage PNG échoué'))),
      'image/png',
    )
  })
}
