import { useRef, useState, type DragEvent } from 'react'

interface DropzoneProps {
  onFileSelected: (file: File) => void
  accept: string
}

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
      className={`group relative flex w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-8 py-20 text-center transition-colors duration-150 ${
        isDraggingOver
          ? 'border-(--color-signal) bg-(--color-signal)/5'
          : 'border-white/15 hover:border-white/30'
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
      <span
        className={`font-mono text-xs uppercase tracking-[0.3em] transition-colors ${
          isDraggingOver ? 'text-(--color-signal)' : 'text-white/40'
        }`}
      >
        {isDraggingOver ? 'Lâchez le fichier' : 'Glissez un fichier ici'}
      </span>
      <p className="font-display text-3xl italic text-(--color-paper) sm:text-4xl">
        ou cliquez pour parcourir
      </p>
      <span className="font-mono text-xs text-white/30">PNG · JPEG — traité localement</span>
    </div>
  )
}
