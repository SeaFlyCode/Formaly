import { useEffect, useState } from 'react'
import { splitPdf } from '../lib/pdf-split'

interface SplitToolProps {
  file: File
  pageCount: number
  onApply: (blob: Blob) => void
}

export function SplitTool({ file, pageCount, onApply }: SplitToolProps) {
  const [thumbnails, setThumbnails] = useState<string[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
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

  function togglePage(index: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(Array.from({ length: pageCount }, (_, i) => i)))
  }

  function selectNone() {
    setSelected(new Set())
  }

  async function handleApply() {
    if (selected.size === 0) return
    setIsApplying(true)
    setError(null)
    try {
      const buffer = await file.arrayBuffer()
      const pageIndices = Array.from(selected).sort((a, b) => a - b)
      const blob = await splitPdf(buffer, pageIndices)
      onApply(blob)
    } catch {
      setError('Découpage échoué — réessayez.')
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-5 rounded-2xl border border-(--color-line) bg-(--color-card) p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] text-(--color-ink-soft)">
          {selected.size} page{selected.size > 1 ? 's' : ''} sélectionnée{selected.size > 1 ? 's' : ''}
          {' '}sur {pageCount}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="rounded-full border border-(--color-line) px-3.5 py-1.5 text-[12px] text-(--color-ink-soft) transition-colors hover:border-(--color-accent)/50"
          >
            Tout sélectionner
          </button>
          <button
            type="button"
            onClick={selectNone}
            className="rounded-full border border-(--color-line) px-3.5 py-1.5 text-[12px] text-(--color-ink-soft) transition-colors hover:border-(--color-accent)/50"
          >
            Tout désélectionner
          </button>
        </div>
      </div>

      {!thumbnails ? (
        <p className="py-10 text-center text-[13px] text-(--color-ink-faint)">Génération des miniatures…</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {thumbnails.map((url, index) => {
            const isSelected = selected.has(index)
            return (
              <button
                key={index}
                type="button"
                onClick={() => togglePage(index)}
                className={`group relative flex flex-col overflow-hidden rounded-xl border-[1.5px] transition-colors ${
                  isSelected
                    ? 'border-(--color-accent) bg-(--color-accent-soft)'
                    : 'border-(--color-line) hover:border-(--color-accent)/50'
                }`}
              >
                <div className="aspect-[3/4] w-full overflow-hidden bg-(--color-paper)">
                  <img src={url} alt={`Page ${index + 1}`} className="h-full w-full object-cover" />
                </div>
                <span className="py-1.5 text-center text-[11px] text-(--color-ink-soft)">
                  Page {index + 1}
                </span>
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-(--color-accent) text-(--color-card)">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {error && <p className="text-[13px] text-red-900/70">{error}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={selected.size === 0 || isApplying}
          onClick={handleApply}
          className="rounded-[10px] bg-(--color-ink) px-[22px] py-[11px] text-sm font-medium text-(--color-card) transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isApplying ? 'Découpage en cours…' : 'Découper le PDF'}
        </button>
      </div>
    </div>
  )
}
