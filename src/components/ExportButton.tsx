interface ExportButtonProps {
  blob: Blob | null
  fileName: string
  isProcessing: boolean
}

export function ExportButton({ blob, fileName, isProcessing }: ExportButtonProps) {
  function handleDownload() {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 rounded-2xl border border-(--color-line) bg-(--color-card) p-4 shadow-[0_20px_40px_-28px_oklch(0.3_0.03_50_/_0.3)] sm:w-auto sm:flex-row">
      <span className="truncate text-sm text-(--color-ink-soft)">{fileName}</span>
      <button
        type="button"
        disabled={!blob || isProcessing}
        onClick={handleDownload}
        className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-(--color-ink) px-[22px] py-[11px] text-sm font-medium text-(--color-card) transition-opacity disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 4v12M12 16l-4-4M12 16l4-4" />
          <path d="M4 20h16" />
        </svg>
        {isProcessing ? 'Conversion en cours…' : 'Télécharger'}
      </button>
    </div>
  )
}
