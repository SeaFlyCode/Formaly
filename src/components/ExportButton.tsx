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
    <button
      type="button"
      disabled={!blob || isProcessing}
      onClick={handleDownload}
      className="w-full rounded-full bg-(--color-signal) px-6 py-3 font-mono text-sm font-medium uppercase tracking-[0.2em] text-(--color-ink) transition-opacity disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
    >
      {isProcessing ? 'Conversion en cours…' : 'Télécharger'}
    </button>
  )
}
