import type { ImageTargetFormat } from '../workers/processing.worker'

interface ToolSelectorProps {
  value: ImageTargetFormat
  onChange: (format: ImageTargetFormat) => void
  disabledFormat: ImageTargetFormat
}

const OPTIONS: { format: ImageTargetFormat; label: string }[] = [
  { format: 'png', label: 'PNG' },
  { format: 'jpeg', label: 'JPEG' },
]

export function ToolSelector({ value, onChange, disabledFormat }: ToolSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs uppercase tracking-[0.3em] text-white/40">
        Convertir en
      </span>
      <div className="flex overflow-hidden rounded-full border border-white/15">
        {OPTIONS.map(({ format, label }) => {
          const isDisabled = format === disabledFormat
          const isActive = value === format && !isDisabled
          return (
            <button
              key={format}
              type="button"
              disabled={isDisabled}
              onClick={() => onChange(format)}
              className={`px-4 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors ${
                isActive
                  ? 'bg-(--color-signal) text-(--color-ink)'
                  : isDisabled
                    ? 'cursor-not-allowed text-white/20'
                    : 'text-white/60 hover:text-white'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
