import { useRef, useState, type DragEvent } from 'react'
import { mergePdfs } from '../lib/pdf-merge'
import { ExportButton } from './ExportButton'

interface MergeItem {
  id: string
  file: File
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

let idCounter = 0

export function MergeTool() {
  const [items, setItems] = useState<MergeItem[]>([])
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [isMerging, setIsMerging] = useState(false)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function addFiles(fileList: FileList | File[]) {
    const pdfFiles = Array.from(fileList).filter((f) => f.type === 'application/pdf')
    if (pdfFiles.length === 0) {
      setError('Seuls les fichiers PDF sont acceptés pour la fusion.')
      return
    }
    setError(null)
    setResultBlob(null)
    setItems((prev) => [...prev, ...pdfFiles.map((file) => ({ id: `${idCounter++}`, file }))])
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDraggingOver(false)
    if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files)
  }

  function removeItem(id: string) {
    setResultBlob(null)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  function moveItem(index: number, direction: -1 | 1) {
    setResultBlob(null)
    setItems((prev) => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function handleMerge() {
    if (items.length < 2) return
    setIsMerging(true)
    setError(null)
    try {
      const blob = await mergePdfs(items.map((item) => item.file))
      setResultBlob(blob)
    } catch {
      setError('Fusion échouée — vérifiez que tous les fichiers sont des PDF valides.')
    } finally {
      setIsMerging(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-8 py-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="font-display text-3xl leading-[1.1] font-medium tracking-tight sm:text-4xl">
          Fusionner des PDF
        </h1>
        <p className="max-w-md text-[15px] text-(--color-ink-soft)">
          Ajoutez plusieurs fichiers PDF, réordonnez-les, puis fusionnez-les en un seul document.
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDraggingOver(true)
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        className={`mx-auto flex w-full max-w-xl cursor-pointer flex-col items-center gap-3 rounded-2xl border-[1.5px] border-dashed px-8 py-8 text-center transition-colors duration-150 ${
          isDraggingOver ? 'border-(--color-accent) bg-(--color-accent-soft)' : 'border-(--color-accent)/50 bg-(--color-card)'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <p className="text-[15px] font-medium">
          {isDraggingOver ? 'Lâchez les fichiers' : 'Glissez des PDF ici'}
        </p>
        <p className="text-sm text-(--color-ink-faint)">
          ou <span className="underline underline-offset-4">parcourez vos fichiers</span>
        </p>
      </div>

      {error && (
        <p className="mx-auto w-full max-w-xl rounded-xl border border-red-900/15 bg-red-900/5 px-4 py-3 text-sm text-red-900/70">
          {error}
        </p>
      )}

      {items.length > 0 && (
        <div className="mx-auto flex w-full max-w-xl flex-col gap-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-(--color-line) bg-(--color-card) px-4 py-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--color-pill) text-[11px] text-(--color-ink-soft)">
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] text-(--color-ink)">{item.file.name}</span>
                <span className="text-[11px] text-(--color-ink-faint)">{formatBytes(item.file.size)}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveItem(index, -1)}
                  aria-label="Monter"
                  className="flex h-8 w-8 items-center justify-center rounded-[8px] text-(--color-ink-soft) transition-colors hover:bg-(--color-pill) disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled={index === items.length - 1}
                  onClick={() => moveItem(index, 1)}
                  aria-label="Descendre"
                  className="flex h-8 w-8 items-center justify-center rounded-[8px] text-(--color-ink-soft) transition-colors hover:bg-(--color-pill) disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12l7 7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  aria-label="Retirer"
                  className="flex h-8 w-8 items-center justify-center rounded-[8px] text-(--color-ink-soft) transition-colors hover:bg-(--color-pill)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="mx-auto flex w-full max-w-xl justify-center">
          <button
            type="button"
            disabled={items.length < 2 || isMerging}
            onClick={handleMerge}
            className="rounded-[10px] bg-(--color-ink) px-[22px] py-[11px] text-sm font-medium text-(--color-card) transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isMerging ? 'Fusion en cours…' : `Fusionner ${items.length} PDF`}
          </button>
        </div>
      )}

      {resultBlob && (
        <ExportButton blob={resultBlob} fileName="fusion.pdf" isProcessing={isMerging} />
      )}
    </div>
  )
}
