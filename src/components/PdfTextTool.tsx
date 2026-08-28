import { useState } from 'react'

interface PdfTextToolProps {
  file: File
  onApply: (blob: Blob) => void
}

export function PdfTextTool({ file, onApply }: PdfTextToolProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [text, setText] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExtract() {
    setIsRunning(true)
    setError(null)
    setText(null)
    try {
      const buffer = await file.arrayBuffer()
      const { extractPdfText } = await import('../lib/pdf-extract-text')
      const extracted = await extractPdfText(buffer)
      setText(extracted)
      onApply(new Blob([extracted], { type: 'text/plain' }))
    } catch {
      setError("Échec de l'extraction du texte — réessayez.")
    } finally {
      setIsRunning(false)
    }
  }

  async function handleCopy() {
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-1 flex-col gap-5 rounded-2xl border border-(--color-line) bg-(--color-card) p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex-1 text-[13px] text-(--color-ink-soft)">
          Extrait le texte natif du PDF (pas de reconnaissance visuelle — inefficace sur un PDF
          scanné, utilisez l'OCR pour ce cas).
        </p>
        <button
          type="button"
          disabled={isRunning}
          onClick={handleExtract}
          className="rounded-[10px] bg-(--color-ink) px-[22px] py-[11px] text-sm font-medium text-(--color-card) transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isRunning ? 'Extraction…' : 'Extraire le texte'}
        </button>
      </div>

      {error && <p className="text-[13px] text-red-900/70">{error}</p>}

      {text !== null && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] tracking-[0.08em] text-(--color-ink-faint) uppercase">
              Texte extrait
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-[13px] text-(--color-ink-soft) underline underline-offset-4 hover:text-(--color-ink)"
            >
              {copied ? 'Copié !' : 'Copier'}
            </button>
          </div>
          <textarea
            readOnly
            value={text}
            className="h-40 w-full resize-none rounded-[10px] border border-(--color-line) bg-(--color-paper) px-3 py-2.5 text-[13px] text-(--color-ink) outline-none"
          />
        </div>
      )}
    </div>
  )
}
