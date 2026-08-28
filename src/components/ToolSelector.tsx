import type { DetectedFileType } from '../lib/file-type-detector'

export type TargetFormat = 'png' | 'jpeg' | 'webp' | 'pdf' | 'avif' | 'bmp' | 'ico' | 'tiff'

interface ToolSelectorProps {
  value: TargetFormat
  onChange: (format: TargetFormat) => void
  sourceType: DetectedFileType
}

const IMAGE_OPTIONS: { format: TargetFormat; label: string }[] = [
  { format: 'png', label: 'PNG' },
  { format: 'jpeg', label: 'JPEG' },
  { format: 'webp', label: 'WebP' },
  { format: 'avif', label: 'AVIF' },
  { format: 'bmp', label: 'BMP' },
  { format: 'ico', label: 'ICO' },
  { format: 'tiff', label: 'TIFF' },
  { format: 'pdf', label: 'PDF' },
]

const PDF_OPTIONS: { format: TargetFormat; label: string }[] = [
  { format: 'png', label: 'PNG' },
  { format: 'jpeg', label: 'JPEG' },
  { format: 'webp', label: 'WebP' },
]

export function ToolSelector({ value, onChange, sourceType }: ToolSelectorProps) {
  const options = sourceType === 'pdf' ? PDF_OPTIONS : IMAGE_OPTIONS

  return (
    <div className="flex flex-row items-center gap-4 sm:flex-col">
      <svg
        className="hidden shrink-0 -rotate-90 sm:block sm:rotate-0"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
      <div className="flex flex-1 flex-col gap-2 sm:w-[130px] sm:flex-none">
        <span className="hidden text-center text-[11px] tracking-[0.08em] text-(--color-ink-faint) uppercase sm:block">
          Convertir en
        </span>
        <div className="flex gap-2 sm:flex-col">
          {options.map(({ format, label }) => {
            const isDisabled = format === sourceType
            const isActive = value === format && !isDisabled
            return (
              <button
                key={format}
                type="button"
                disabled={isDisabled}
                onClick={() => onChange(format)}
                className={`flex-1 rounded-[10px] px-3.5 py-2.5 text-[13px] transition-colors sm:flex-none ${
                  isActive
                    ? 'bg-(--color-accent) font-medium text-(--color-card)'
                    : isDisabled
                      ? 'cursor-not-allowed border border-(--color-line) text-(--color-ink-faint)/50'
                      : 'border border-(--color-line) text-(--color-ink-soft) hover:border-(--color-accent)/50'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
