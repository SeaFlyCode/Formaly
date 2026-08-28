import { useEffect, useState } from 'react'
import { resizeImageToBlob, type ResizeOutputFormat } from '../lib/resize-image'

interface ResizeToolProps {
  imageUrl: string
  sourceFormat: ResizeOutputFormat
  onApply: (blob: Blob) => void
}

const FORMAT_OPTIONS: { format: ResizeOutputFormat; label: string }[] = [
  { format: 'png', label: 'PNG' },
  { format: 'jpeg', label: 'JPEG' },
  { format: 'webp', label: 'WebP' },
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export function ResizeTool({ imageUrl, sourceFormat, onApply }: ResizeToolProps) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null)
  const [width, setWidth] = useState<number | null>(null)
  const [height, setHeight] = useState<number | null>(null)
  const [lockRatio, setLockRatio] = useState(true)
  const [format, setFormat] = useState<ResizeOutputFormat>(sourceFormat)
  const [quality, setQuality] = useState(85)
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const image = new Image()
    image.onload = () => {
      setNaturalSize({ width: image.naturalWidth, height: image.naturalHeight })
      setWidth(image.naturalWidth)
      setHeight(image.naturalHeight)
    }
    image.src = imageUrl
  }, [imageUrl])

  useEffect(() => {
    if (!width || !height) return
    let cancelled = false
    const timeout = setTimeout(() => {
      resizeImageToBlob(imageUrl, { width, height, format, quality })
        .then((blob) => {
          if (cancelled) return
          setEstimatedSize(blob.size)
          setPreviewUrl(URL.createObjectURL(blob))
        })
        .catch(() => {
          if (!cancelled) setEstimatedSize(null)
        })
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [imageUrl, width, height, format, quality])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const ratio = naturalSize ? naturalSize.width / naturalSize.height : 1

  function handleWidthChange(value: number) {
    setWidth(value)
    if (lockRatio) setHeight(Math.round(value / ratio))
  }

  function handleHeightChange(value: number) {
    setHeight(value)
    if (lockRatio) setWidth(Math.round(value * ratio))
  }

  async function handleApply() {
    if (!width || !height) return
    setIsApplying(true)
    setError(null)
    try {
      const blob = await resizeImageToBlob(imageUrl, { width, height, format, quality })
      onApply(blob)
    } catch {
      setError('Redimensionnement échoué — réessayez.')
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-5 rounded-2xl border border-(--color-line) bg-(--color-card) p-6">
      <div className="relative h-[380px] w-full overflow-hidden rounded-xl bg-(--color-paper) sm:h-[440px]">
        <img src={previewUrl ?? imageUrl} alt="Aperçu" className="h-full w-full object-contain" />
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
          <label className="flex flex-1 flex-col gap-1.5 text-[13px] text-(--color-ink-soft)">
            Largeur (px)
            <input
              type="number"
              min={1}
              value={width ?? ''}
              onChange={(e) => handleWidthChange(Number(e.target.value))}
              className="rounded-[10px] border border-(--color-line) bg-(--color-card) px-3 py-2.5 text-[13px] text-(--color-ink) outline-none focus:border-(--color-accent)/60"
            />
          </label>

          <button
            type="button"
            onClick={() => setLockRatio((v) => !v)}
            aria-label={lockRatio ? 'Ratio verrouillé' : 'Ratio libre'}
            title={lockRatio ? 'Ratio verrouillé' : 'Ratio libre'}
            className={`flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-[10px] transition-colors sm:self-auto ${
              lockRatio
                ? 'bg-(--color-accent) text-(--color-card)'
                : 'border border-(--color-line) text-(--color-ink-soft) hover:border-(--color-accent)/50'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              {lockRatio ? (
                <path d="M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z" />
              ) : (
                <path d="M7 11V7a5 5 0 0 1 9.9-1M5 11h14v10H5z" />
              )}
            </svg>
          </button>

          <label className="flex flex-1 flex-col gap-1.5 text-[13px] text-(--color-ink-soft)">
            Hauteur (px)
            <input
              type="number"
              min={1}
              value={height ?? ''}
              onChange={(e) => handleHeightChange(Number(e.target.value))}
              className="rounded-[10px] border border-(--color-line) bg-(--color-card) px-3 py-2.5 text-[13px] text-(--color-ink) outline-none focus:border-(--color-accent)/60"
            />
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] tracking-[0.08em] text-(--color-ink-faint) uppercase">
            Format de sortie
          </span>
          <div className="flex gap-2">
            {FORMAT_OPTIONS.map(({ format: f, label }) => {
              const isActive = format === f
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`flex-1 rounded-[10px] px-3.5 py-2.5 text-[13px] transition-colors sm:flex-none ${
                    isActive
                      ? 'bg-(--color-accent) font-medium text-(--color-card)'
                      : 'border border-(--color-line) text-(--color-ink-soft) hover:border-(--color-accent)/50'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {format !== 'png' && (
          <label className="flex flex-col gap-1.5 text-[13px] text-(--color-ink-soft)">
            <span className="flex items-center justify-between">
              Qualité de compression
              <span className="font-mono text-[12px] text-(--color-ink-faint)">{quality}%</span>
            </span>
            <input
              type="range"
              min={1}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="accent-(--color-accent)"
            />
          </label>
        )}

        {error && <p className="text-[13px] text-red-900/70">{error}</p>}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[13px] text-(--color-ink-soft)">
            {estimatedSize !== null ? (
              <>
                Poids estimé <span className="font-mono text-(--color-ink)">{formatBytes(estimatedSize)}</span>
              </>
            ) : (
              'Calcul du poids…'
            )}
          </span>
          <button
            type="button"
            disabled={!width || !height || isApplying}
            onClick={handleApply}
            className="rounded-[10px] bg-(--color-ink) px-[22px] py-[11px] text-sm font-medium text-(--color-card) transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isApplying ? 'Traitement…' : 'Appliquer'}
          </button>
        </div>
      </div>
    </div>
  )
}
