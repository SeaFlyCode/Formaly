import { useRef, useState, type DragEvent } from 'react'

interface DropzoneProps {
  onFileSelected: (file: File) => void
  accept: string
}

const FORMAT_PILLS = ['PNG', 'JPEG', 'WEBP', 'PDF', 'HEIC']

export function Dropzone({ onFileSelected, accept }: DropzoneProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDraggingOver(false)
    const file = event.dataTransfer.files[0]
    if (file) onFileSelected(file)
  }

  return (
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
      className={`mx-auto flex w-full max-w-xl cursor-pointer flex-col items-center gap-5 rounded-2xl border-[1.5px] border-dashed px-8 py-12 text-center shadow-[0_24px_48px_-24px_oklch(0.3_0.03_50_/_0.28)] transition-colors duration-150 sm:py-14 ${
        isDraggingOver ? 'border-(--color-accent) bg-(--color-accent-soft)' : 'border-(--color-accent)/50 bg-(--color-card)'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileSelected(file)
        }}
      />
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-(--color-accent-soft)">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-accent-dim)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-[17px] font-medium">
          {isDraggingOver ? 'Lâchez le fichier' : 'Glissez un fichier ici'}
        </p>
        <p className="text-sm text-(--color-ink-faint)">
          ou <span className="underline underline-offset-4">parcourez vos fichiers</span>
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {FORMAT_PILLS.map((label) => (
          <span
            key={label}
            className="rounded-full bg-(--color-pill) px-[11px] py-[5px] text-[11px] tracking-wide text-(--color-ink-soft)"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
