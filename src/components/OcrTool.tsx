import { useState } from 'react'
import { extractText } from '../lib/ocr'

interface OcrToolProps {
  imageUrl: string
  onApply: (blob: Blob) => void
}

export function OcrTool({ imageUrl, onApply }: OcrToolProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [text, setText] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExtract() {
    setIsRunning(true)
    setError(null)
    setProgress(0)
    setText(null)
    try {
      const extracted = await extractText(imageUrl, setProgress)
      setText(extracted)
      onApply(new Blob([extracted], { type: 'text/plain' }))
    } catch {
      setError("Échec de l'extraction du texte — réessayez ou utilisez une autre image.")
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
      <div className="relative h-[380px] w-full overflow-hidden rounded-xl bg-(--color-paper) sm:h-[440px]">
        <img src={imageUrl} alt="Aperçu" className="h-full w-full object-contain" />
      </div>

      {error && <p className="text-[13px] text-red-900/70">{error}</p>}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex-1 text-[13px] text-(--color-ink-soft)">
          {isRunning
            ? `Reconnaissance du texte en cours… ${progress}%`
            : 'Extrait le texte visible dans l\'image, directement dans votre navigateur.'}
        </p>
        <button
          type="button"
          disabled={isRunning}
          onClick={handleExtract}
          className="rounded-[10px] bg-(--color-ink) px-[22px] py-[11px] text-sm font-medium text-(--color-card) transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isRunning ? 'Traitement…' : 'Extraire le texte'}
        </button>
      </div>

      {isRunning && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-(--color-paper)">
          <div
            className="h-full rounded-full bg-(--color-accent) transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

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
