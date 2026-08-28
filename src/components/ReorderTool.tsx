import { useEffect, useState } from 'react'
import { reorderPdfPages } from '../lib/pdf-reorder'

interface ReorderToolProps {
  file: File
  pageCount: number
  onApply: (blob: Blob) => void
}

export function ReorderTool({ file, pageCount, onApply }: ReorderToolProps) {
  const [thumbnails, setThumbnails] = useState<string[] | null>(null)
  const [order, setOrder] = useState<number[]>(() => Array.from({ length: pageCount }, (_, i) => i))
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let urls: string[] = []

    file.arrayBuffer().then(async (buffer) => {
      try {
        const { renderPdfThumbnails } = await import('../lib/pdf-to-images')
        const blobs = await renderPdfThumbnails(buffer)
        if (cancelled) return
        urls = blobs.map((blob) => URL.createObjectURL(blob))
        setThumbnails(urls)
      } catch {
        if (!cancelled) setError('Impossible de générer les miniatures.')
      }
    })

    return () => {
      cancelled = true
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [file])

  function moveTo(position: number, direction: -1 | 1) {
    setOrder((prev) => {
      const next = [...prev]
      const target = position + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[position], next[target]] = [next[target], next[position]]
      return next
    })
  }

  async function handleApply() {
    setIsApplying(true)
    setError(null)
    try {
      const buffer = await file.arrayBuffer()
      const blob = await reorderPdfPages(buffer, order)
      onApply(blob)
    } catch {
      setError('Réorganisation échouée — réessayez.')
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-5 rounded-2xl border border-(--color-line) bg-(--color-card) p-6">
      {!thumbnails ? (
        <p className="py-10 text-center text-[13px] text-(--color-ink-faint)">Génération des miniatures…</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {order.map((pageIndex, position) => (
            <div
              key={pageIndex}
              className="flex flex-col overflow-hidden rounded-xl border-[1.5px] border-(--color-line)"
            >
              <div className="aspect-[3/4] w-full overflow-hidden bg-(--color-paper)">
                <img
                  src={thumbnails[pageIndex]}
                  alt={`Page ${pageIndex + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="pt-1.5 text-center text-[11px] text-(--color-ink-soft)">
                Page {pageIndex + 1}
              </span>
              <div className="flex items-center justify-center gap-1 pb-1.5">
                <button
                  type="button"
                  disabled={position === 0}
                  onClick={() => moveTo(position, -1)}
                  aria-label="Monter"
                  className="flex h-7 w-7 items-center justify-center rounded-[8px] text-(--color-ink-soft) transition-colors hover:bg-(--color-pill) disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled={position === order.length - 1}
                  onClick={() => moveTo(position, 1)}
                  aria-label="Descendre"
                  className="flex h-7 w-7 items-center justify-center rounded-[8px] text-(--color-ink-soft) transition-colors hover:bg-(--color-pill) disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12l7 7 7-7" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-[13px] text-red-900/70">{error}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!thumbnails || isApplying}
          onClick={handleApply}
          className="rounded-[10px] bg-(--color-ink) px-[22px] py-[11px] text-sm font-medium text-(--color-card) transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isApplying ? 'Réorganisation en cours…' : "Appliquer l'ordre"}
        </button>
      </div>
    </div>
  )
}
