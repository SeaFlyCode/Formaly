import type { ReactNode } from 'react'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

interface PreviewPanelProps {
  originalUrl: string
  originalIsImage: boolean
  originalLabel: string
  originalFormatLabel: string
  originalSize: number
  resultUrl: string | null
  resultIsImage: boolean
  resultLabel: string
  resultFormatLabel: string
  resultSize: number | null
  isProcessing: boolean
  children: ReactNode
}

function FileIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
    </svg>
  )
}

function PreviewSlot({
  label,
  formatLabel,
  size,
  url,
  isImage,
  badgeAccent,
  emptyMessage,
}: {
  label: string
  formatLabel: string
  size: number | null
  url: string | null
  isImage: boolean
  badgeAccent: boolean
  emptyMessage: string
}) {
  return (
    <div className="flex flex-1 flex-col gap-4 rounded-2xl border border-(--color-line) bg-(--color-card) p-6">
      <div className="flex items-center justify-between">
        <span className="text-[11px] tracking-[0.08em] text-(--color-ink-faint) uppercase">{label}</span>
        {url && size !== null && (
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] ${
              badgeAccent
                ? 'bg-(--color-accent-soft) text-(--color-accent-dim)'
                : 'bg-(--color-pill) text-(--color-ink-soft)'
            }`}
          >
            {formatLabel} · {formatBytes(size)}
          </span>
        )}
      </div>
      <div className="relative flex aspect-4/3 items-center justify-center overflow-hidden rounded-xl bg-(--color-paper) text-(--color-ink-faint)">
        {url && isImage ? (
          <img src={url} alt={label} className="h-full w-full object-contain" />
        ) : url ? (
          <div className="flex flex-col items-center gap-2">
            <FileIcon />
            <span className="text-xs">{formatLabel}</span>
          </div>
        ) : (
          <span className="text-xs">{emptyMessage}</span>
        )}
      </div>
    </div>
  )
}

export function PreviewPanel({
  originalUrl,
  originalIsImage,
  originalLabel,
  originalFormatLabel,
  originalSize,
  resultUrl,
  resultIsImage,
  resultLabel,
  resultFormatLabel,
  resultSize,
  isProcessing,
  children,
}: PreviewPanelProps) {
  return (
    <>
      <PreviewSlot
        label={originalLabel}
        formatLabel={originalFormatLabel}
        size={originalSize}
        url={originalUrl}
        isImage={originalIsImage}
        badgeAccent={false}
        emptyMessage=""
      />
      <div className="flex items-center justify-center sm:pt-8">{children}</div>
      <PreviewSlot
        label={resultLabel}
        formatLabel={resultFormatLabel}
        size={resultSize}
        url={resultUrl}
        isImage={resultIsImage}
        badgeAccent
        emptyMessage={isProcessing ? 'Conversion…' : 'En attente'}
      />
    </>
  )
}
