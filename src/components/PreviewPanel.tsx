interface PreviewPanelProps {
  originalUrl: string
  originalLabel: string
  resultUrl: string | null
  resultLabel: string
  isProcessing: boolean
}

export function PreviewPanel({
  originalUrl,
  originalLabel,
  resultUrl,
  resultLabel,
  isProcessing,
}: PreviewPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <figure className="flex flex-col gap-3">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-white/40">
          {originalLabel}
        </span>
        <div className="aspect-square overflow-hidden rounded-xl border border-white/10 bg-(--color-ink-raised)">
          <img src={originalUrl} alt="Aperçu du fichier original" className="h-full w-full object-contain" />
        </div>
      </figure>

      <figure className="flex flex-col gap-3">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-white/40">
          {resultLabel}
        </span>
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-(--color-ink-raised)">
          {resultUrl ? (
            <img src={resultUrl} alt="Aperçu du fichier converti" className="h-full w-full object-contain" />
          ) : (
            <span className="font-mono text-xs text-white/25">
              {isProcessing ? 'Conversion…' : 'En attente'}
            </span>
          )}
        </div>
      </figure>
    </div>
  )
}
