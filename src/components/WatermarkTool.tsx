import { useState } from 'react'
import { watermarkImage } from '../lib/watermark'

interface WatermarkToolProps {
  imageUrl: string
  onApply: (blob: Blob) => void
}

export function WatermarkTool({ imageUrl, onApply }: WatermarkToolProps) {
  const [text, setText] = useState('CONFIDENTIEL')
  const [opacity, setOpacity] = useState(30)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleApply() {
    if (!text.trim()) return
    setIsApplying(true)
    setError(null)
    try {
      const blob = await watermarkImage(imageUrl, { text: text.trim(), opacity: opacity / 100 })
      onApply(blob)
    } catch {
      setError('Filigrane échoué — réessayez.')
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-5 rounded-2xl border border-(--color-line) bg-(--color-card) p-6">
      <div className="relative h-[380px] w-full overflow-hidden rounded-xl bg-(--color-paper) sm:h-[440px]">
        <img src={imageUrl} alt="Aperçu" className="h-full w-full object-contain" />
      </div>

      <label className="flex flex-col gap-1.5 text-[13px] text-(--color-ink-soft)">
        Texte du filigrane
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="rounded-[10px] border border-(--color-line) bg-(--color-paper) px-3 py-2.5 text-[13px] text-(--color-ink) outline-none focus:border-(--color-accent)/60"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-[13px] text-(--color-ink-soft)">
        <span className="flex items-center justify-between">
          Opacité
          <span className="font-mono text-[12px] text-(--color-ink-faint)">{opacity}%</span>
        </span>
        <input
          type="range"
          min={5}
          max={100}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="accent-(--color-accent)"
        />
      </label>

      {error && <p className="text-[13px] text-red-900/70">{error}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!text.trim() || isApplying}
          onClick={handleApply}
          className="rounded-[10px] bg-(--color-ink) px-[22px] py-[11px] text-sm font-medium text-(--color-card) transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isApplying ? 'Application…' : 'Appliquer le filigrane'}
        </button>
      </div>
    </div>
  )
}
