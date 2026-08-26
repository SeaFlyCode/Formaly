export type EditMode = 'convert' | 'crop' | 'remove-bg' | 'resize' | 'split' | 'ocr'

interface ModeSelectorProps {
  value: EditMode
  onChange: (mode: EditMode) => void
}

const MODES: { mode: EditMode; label: string }[] = [
  { mode: 'convert', label: 'Convertir' },
  { mode: 'crop', label: 'Rogner' },
  { mode: 'remove-bg', label: 'Supprimer le fond' },
  { mode: 'resize', label: 'Compresser / Redimensionner' },
  { mode: 'ocr', label: 'Extraire le texte' },
]

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <div className="flex justify-center gap-2">
      {MODES.map(({ mode, label }) => {
        const isActive = value === mode
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={`rounded-full px-4 py-2 text-[13px] transition-colors ${
              isActive
                ? 'bg-(--color-accent) font-medium text-(--color-card)'
                : 'border border-(--color-line) text-(--color-ink-soft) hover:border-(--color-accent)/50'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
