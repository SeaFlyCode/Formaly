import { useEffect, useState } from 'react'

interface CompressToolProps {
  file: File
  onApply: (blob: Blob) => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export function CompressTool({ file, onApply }: CompressToolProps) {
  const [quality, setQuality] = useState(60)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [resultSize, setResultSize] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const timeout = setTimeout(() => {
      file.arrayBuffer().then(async (buffer) => {
        try {
          const { renderFirstPageJpeg } = await import('../lib/pdf-to-images')
          const blob = await renderFirstPageJpeg(buffer, quality / 100)
          if (!cancelled) setPreviewUrl(URL.createObjectURL(blob))
        } catch {
          /* aperçu best-effort — l'erreur réelle est signalée à l'application */
        }
      })
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [file, quality])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function handleApply() {
    setIsApplying(true)
    setError(null)
    setResultSize(null)
    try {
      const buffer = await file.arrayBuffer()
      const { compressPdf } = await import('../lib/pdf-to-images')
      const blob = await compressPdf(buffer, quality / 100)
      setResultSize(blob.size)
      onApply(blob)
    } catch {
      setError('Compression échouée — réessayez.')
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-5 rounded-2xl border border-(--color-line) bg-(--color-card) p-6">
      <div className="relative h-[380px] w-full overflow-hidden rounded-xl bg-(--color-paper) sm:h-[440px]">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Aperçu (1ère page)"
            className="h-full w-full object-contain"
          />
        ) : (
          <p className="flex h-full items-center justify-center text-[13px] text-(--color-ink-faint)">
            Génération de l'aperçu…
          </p>
        )}
      </div>

      <p className="text-[13px] text-(--color-ink-soft)">
        Réduit le poids du PDF en rasterisant chaque page en JPEG compressé — la taille d'origine
        était de <span className="font-mono text-(--color-ink)">{formatBytes(file.size)}</span>.
        Le texte devient une image, non sélectionnable.
      </p>

      <label className="flex flex-col gap-1.5 text-[13px] text-(--color-ink-soft)">
        <span className="flex items-center justify-between">
          Qualité
          <span className="font-mono text-[12px] text-(--color-ink-faint)">{quality}%</span>
        </span>
        <input
          type="range"
          min={10}
          max={95}
          value={quality}
          onChange={(e) => setQuality(Number(e.target.value))}
          className="accent-(--color-accent)"
        />
      </label>

      {error && <p className="text-[13px] text-red-900/70">{error}</p>}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[13px] text-(--color-ink-soft)">
          {resultSize !== null && (
            <>
              Nouveau poids <span className="font-mono text-(--color-ink)">{formatBytes(resultSize)}</span>
            </>
          )}
        </span>
        <button
          type="button"
          disabled={isApplying}
          onClick={handleApply}
          className="rounded-[10px] bg-(--color-ink) px-[22px] py-[11px] text-sm font-medium text-(--color-card) transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isApplying ? 'Compression…' : 'Compresser'}
        </button>
      </div>
    </div>
  )
}
