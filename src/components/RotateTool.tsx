import { useEffect, useState } from 'react'
import { rotatePdfPages } from '../lib/pdf-rotate'

interface RotateToolProps {
  file: File
  onApply: (blob: Blob) => void
}

export function RotateTool({ file, onApply }: RotateToolProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let url: string | null = null

    file.arrayBuffer().then(async (buffer) => {
      try {
        const { renderPdfThumbnails } = await import('../lib/pdf-to-images')
        const [thumbnail] = await renderPdfThumbnails(buffer)
        if (cancelled || !thumbnail) return
        url = URL.createObjectURL(thumbnail)
        setPreviewUrl(url)
      } catch {
        if (!cancelled) setError("Impossible de générer l'aperçu.")
      }
    })

    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [file])

  function rotateBy(delta: number) {
    setRotation((prev) => (((prev + delta) % 360) + 360) % 360)
  }

  async function handleApply() {
    setIsApplying(true)
    setError(null)
    try {
      const buffer = await file.arrayBuffer()
      const blob = await rotatePdfPages(buffer, rotation)
      onApply(blob)
    } catch {
      setError('Rotation échouée — réessayez.')
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-5 rounded-2xl border border-(--color-line) bg-(--color-card) p-6">
      <div className="relative flex h-[380px] w-full items-center justify-center overflow-hidden rounded-xl bg-(--color-paper) sm:h-[440px]">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Aperçu"
            className="max-h-full max-w-full object-contain transition-transform duration-200"
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        ) : (
          <p className="text-[13px] text-(--color-ink-faint)">Génération de l'aperçu…</p>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => rotateBy(-90)}
            className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-(--color-line) text-(--color-ink-soft) transition-colors hover:border-(--color-accent)/50"
            aria-label="Rotation à gauche"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 14 4 9l5-5" />
              <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => rotateBy(90)}
            className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-(--color-line) text-(--color-ink-soft) transition-colors hover:border-(--color-accent)/50"
            aria-label="Rotation à droite"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 14 5-5-5-5" />
              <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13" />
            </svg>
          </button>
        </div>

        {error && <p className="text-[13px] text-red-900/70">{error}</p>}

        <button
          type="button"
          disabled={rotation === 0 || isApplying}
          onClick={handleApply}
          className="rounded-[10px] bg-(--color-ink) px-[22px] py-[11px] text-sm font-medium text-(--color-card) transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isApplying ? 'Rotation en cours…' : 'Appliquer la rotation'}
        </button>
      </div>
    </div>
  )
}
