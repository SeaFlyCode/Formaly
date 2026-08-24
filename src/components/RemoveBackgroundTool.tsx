import { useState } from 'react'
import { removeBackground, type RemoveBackgroundProgress } from '../lib/remove-background'

interface RemoveBackgroundToolProps {
  imageUrl: string
  file: File
  onApply: (blob: Blob) => void
}

export function RemoveBackgroundTool({ imageUrl, file, onApply }: RemoveBackgroundToolProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<RemoveBackgroundProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleApply() {
    setIsRunning(true)
    setError(null)
    setProgress({ status: 'downloading', progress: 0 })
    try {
      const blob = await removeBackground(file, setProgress)
      onApply(blob)
    } catch {
      setError("Échec de la suppression du fond — réessayez ou utilisez une autre image.")
    } finally {
      setIsRunning(false)
      setProgress(null)
    }
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
            ? progress?.status === 'downloading'
              ? `Téléchargement du modèle IA… ${progress.progress}%`
              : 'Analyse de l\'image en cours…'
            : 'Détecte le sujet et rend le fond transparent, directement dans votre navigateur.'}
        </p>
        <button
          type="button"
          disabled={isRunning}
          onClick={handleApply}
          className="rounded-[10px] bg-(--color-ink) px-[22px] py-[11px] text-sm font-medium text-(--color-card) transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isRunning ? 'Traitement…' : 'Supprimer le fond'}
        </button>
      </div>
    </div>
  )
}
