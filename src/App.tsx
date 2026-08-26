import { useEffect, useRef, useState } from 'react'
import { Dropzone } from './components/Dropzone'
import { ToolSelector, type TargetFormat } from './components/ToolSelector'
import { ModeSelector, type EditMode } from './components/ModeSelector'
import { CropTool } from './components/CropTool'
import { RemoveBackgroundTool } from './components/RemoveBackgroundTool'
import { ResizeTool } from './components/ResizeTool'
import { SplitTool } from './components/SplitTool'
import { MergeTool } from './components/MergeTool'
import type { ResizeOutputFormat } from './lib/resize-image'
import { PreviewPanel } from './components/PreviewPanel'
import { ExportButton } from './components/ExportButton'
import { detectFileType, type DetectedFileType } from './lib/file-type-detector'
import type {
  ImageTargetFormat,
  ProcessingError,
  ProcessingRequest,
  ProcessingSuccess,
} from './workers/processing.worker'

const MIME_BY_DETECTED: Record<DetectedFileType, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  pdf: 'application/pdf',
  heic: 'image/heic',
}

const EXTENSION_BY_FORMAT: Record<TargetFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
  pdf: 'pdf',
}

function isImageTargetFormat(format: TargetFormat): format is ImageTargetFormat {
  return format === 'png' || format === 'jpeg' || format === 'webp'
}

function App() {
  const workerRef = useRef<Worker | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [sourceType, setSourceType] = useState<DetectedFileType | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<EditMode>('convert')
  const [targetFormat, setTargetFormat] = useState<TargetFormat>('jpeg')
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null)
  const [pdfPageAsset, setPdfPageAsset] = useState<{ url: string; file: File } | null>(null)
  const [isPreparingPdfPage, setIsPreparingPdfPage] = useState(false)
  const [heicAsset, setHeicAsset] = useState<{ url: string; file: File } | null>(null)
  const [isPreparingHeic, setIsPreparingHeic] = useState(false)
  const [showMerge, setShowMerge] = useState(false)

  useEffect(() => {
    const worker = new Worker(new URL('./workers/processing.worker.ts', import.meta.url), {
      type: 'module',
    })
    workerRef.current = worker
    return () => worker.terminate()
  }, [])

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl)
    }
  }, [originalUrl])

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl)
    }
  }, [resultUrl])

  useEffect(() => {
    return () => {
      if (pdfPageAsset) URL.revokeObjectURL(pdfPageAsset.url)
    }
  }, [pdfPageAsset])

  useEffect(() => {
    return () => {
      if (heicAsset) URL.revokeObjectURL(heicAsset.url)
    }
  }, [heicAsset])

  useEffect(() => {
    if (!file || sourceType !== 'heic') return

    let cancelled = false
    setIsPreparingHeic(true)
    setHeicAsset(null)

    convertHeicFile(file)

    async function convertHeicFile(source: File) {
      try {
        const { convertHeicToPng } = await import('./lib/heic-convert')
        const pngBlob = await convertHeicToPng(source)
        if (cancelled) return
        const baseName = source.name.replace(/\.[^.]+$/, '')
        const pngFile = new File([pngBlob], `${baseName}.png`, { type: 'image/png' })
        setHeicAsset({ url: URL.createObjectURL(pngFile), file: pngFile })
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Conversion HEIC échouée')
      } finally {
        if (!cancelled) setIsPreparingHeic(false)
      }
    }

    return () => {
      cancelled = true
    }
  }, [file, sourceType])

  useEffect(() => {
    if (!file || sourceType !== 'pdf') return

    let cancelled = false
    setIsPreparingPdfPage(true)
    setPdfPageCount(null)
    setPdfPageAsset(null)

    file.arrayBuffer().then(async (buffer) => {
      try {
        const { inspectPdf } = await import('./lib/pdf-to-images')
        const { pageCount, firstPageBlob } = await inspectPdf(buffer)
        if (cancelled) return
        setPdfPageCount(pageCount)
        if (firstPageBlob) {
          const baseName = file.name.replace(/\.[^.]+$/, '')
          const pageFile = new File([firstPageBlob], `${baseName}.png`, { type: 'image/png' })
          setPdfPageAsset({ url: URL.createObjectURL(pageFile), file: pageFile })
        }
      } catch {
        if (!cancelled) setPdfPageCount(null)
      } finally {
        if (!cancelled) setIsPreparingPdfPage(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [file, sourceType])

  async function handleFileSelected(selected: File) {
    setError(null)
    setResultUrl(null)
    setResultBlob(null)

    const detected = await detectFileType(selected)
    if (!detected) {
      setError('Format non reconnu — seuls PNG, JPEG, WebP, PDF et HEIC sont supportés pour le moment.')
      return
    }

    setFile(selected)
    setSourceType(detected)
    setOriginalUrl(URL.createObjectURL(selected))
    setEditMode('convert')
    setTargetFormat(
      detected === 'pdf' ? 'png' : detected === 'heic' ? 'jpeg' : detected === 'png' ? 'jpeg' : 'png',
    )
  }

  function handleModeChange(mode: EditMode) {
    setEditMode(mode)
    setResultUrl(null)
    setResultBlob(null)
    setError(null)
  }

  function handleToolApplied(blob: Blob) {
    setResultBlob(blob)
    setResultUrl(URL.createObjectURL(blob))
  }

  useEffect(() => {
    if (!file || !sourceType || editMode !== 'convert') return

    setIsProcessing(true)
    setError(null)

    const baseName = file.name.replace(/\.[^.]+$/, '')

    if (sourceType === 'pdf') {
      if (!isImageTargetFormat(targetFormat)) return

      let cancelled = false
      file.arrayBuffer().then(async (buffer) => {
        try {
          const { convertPdfToImages } = await import('./lib/pdf-to-images')
          const blob = await convertPdfToImages(buffer, targetFormat, baseName)
          if (cancelled) return
          setResultBlob(blob)
          setResultUrl(URL.createObjectURL(blob))
        } catch (err) {
          if (cancelled) return
          setError(err instanceof Error ? err.message : 'Conversion échouée')
        } finally {
          if (!cancelled) setIsProcessing(false)
        }
      })

      return () => {
        cancelled = true
      }
    }

    if (sourceType === 'heic' && !heicAsset) return

    const worker = workerRef.current
    if (!worker) return

    function handleMessage(event: MessageEvent<ProcessingSuccess | ProcessingError>) {
      if (event.data.type === 'processing-success') {
        setResultBlob(event.data.blob)
        setResultUrl(URL.createObjectURL(event.data.blob))
      } else {
        setError(event.data.message)
      }
      setIsProcessing(false)
    }

    worker.addEventListener('message', handleMessage)

    const sourceFile = sourceType === 'heic' && heicAsset ? heicAsset.file : file
    const sourceMimeType = sourceType === 'heic' ? 'image/png' : MIME_BY_DETECTED[sourceType]

    sourceFile.arrayBuffer().then((buffer) => {
      const request: ProcessingRequest =
        targetFormat === 'pdf'
          ? { type: 'image-to-pdf', file: buffer, sourceMimeType }
          : {
              type: 'convert-image',
              file: buffer,
              sourceMimeType,
              targetFormat,
            }
      worker.postMessage(request, [buffer])
    })

    return () => worker.removeEventListener('message', handleMessage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, sourceType, targetFormat, editMode, heicAsset])

  const cropSourceFormat = sourceType === 'pdf' || sourceType === 'heic' ? 'png' : sourceType
  const resizeSourceFormat: ResizeOutputFormat = cropSourceFormat === 'jpeg' || cropSourceFormat === 'webp' ? cropSourceFormat : 'png'
  const resultExtension =
    resultBlob?.type === 'application/zip'
      ? 'zip'
      : editMode === 'remove-bg'
        ? 'png'
        : editMode === 'split'
          ? 'pdf'
          : editMode === 'resize' && resultBlob
            ? (resultBlob.type.split('/')[1] === 'jpeg' ? 'jpg' : resultBlob.type.split('/')[1])
            : EXTENSION_BY_FORMAT[editMode === 'crop' && cropSourceFormat ? cropSourceFormat : targetFormat]
  const exportFileName = file
    ? `${file.name.replace(/\.[^.]+$/, '')}.${resultExtension}`
    : 'converted'
  const resultFormatLabel =
    resultBlob?.type === 'application/zip'
      ? 'ZIP'
      : editMode === 'remove-bg'
        ? 'PNG'
        : editMode === 'split'
          ? 'PDF'
          : editMode === 'resize' && resultBlob
            ? resultBlob.type.split('/')[1].toUpperCase()
            : (editMode === 'crop' && cropSourceFormat ? cropSourceFormat : targetFormat).toUpperCase()

  function handleReset() {
    setFile(null)
    setSourceType(null)
    setOriginalUrl(null)
    setEditMode('convert')
    setResultUrl(null)
    setResultBlob(null)
    setError(null)
    setPdfPageCount(null)
    setPdfPageAsset(null)
    setIsPreparingPdfPage(false)
    setHeicAsset(null)
    setIsPreparingHeic(false)
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-9 sm:px-16 sm:py-10">
      <header className="flex items-center justify-between">
        <span className="font-display text-[22px] font-semibold">Formaly</span>
        {file ? (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-(--color-ink-faint) underline underline-offset-4 hover:text-(--color-ink)"
          >
            Changer de fichier
          </button>
        ) : showMerge ? (
          <button
            type="button"
            onClick={() => setShowMerge(false)}
            className="text-xs text-(--color-ink-faint) underline underline-offset-4 hover:text-(--color-ink)"
          >
            Retour
          </button>
        ) : (
          <div className="flex items-center gap-2.5 text-xs tracking-[0.08em] text-(--color-ink-soft) uppercase">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-(--color-accent)" />
            Traitement 100% local
          </div>
        )}
      </header>

      {!file && showMerge && <MergeTool />}

      {!file && !showMerge && (
        <div className="flex flex-1 flex-col items-center justify-center gap-11 py-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="font-display max-w-2xl text-4xl leading-[1.1] font-medium tracking-tight sm:text-5xl">
              Convertissez vos fichiers sans qu'ils quittent votre appareil.
            </h1>
            <p className="max-w-md text-[17px] text-(--color-ink-soft)">
              PNG, JPEG, WebP, PDF, HEIC — gratuit, sans compte, sans limite. Tout se passe dans
              votre navigateur.
            </p>
          </div>

          <Dropzone
            accept="image/png,image/jpeg,image/webp,application/pdf,image/heic,image/heif"
            onFileSelected={handleFileSelected}
          />

          <button
            type="button"
            onClick={() => setShowMerge(true)}
            className="text-[13px] text-(--color-ink-soft) underline underline-offset-4 hover:text-(--color-ink)"
          >
            Ou fusionnez plusieurs PDF en un seul document →
          </button>

          <p className="text-xs text-(--color-ink-faint)">Aucun fichier n'est jamais envoyé à un serveur.</p>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-900/15 bg-red-900/5 px-4 py-3 text-sm text-red-900/70">
          {error}
        </p>
      )}

      {file && originalUrl && sourceType && (
        <div className="flex flex-1 flex-col justify-center gap-8 py-4">
          {sourceType === 'pdf' && isPreparingPdfPage && (
            <p className="text-center text-[13px] text-(--color-ink-faint)">Analyse du PDF…</p>
          )}

          {sourceType === 'heic' && isPreparingHeic && (
            <p className="text-center text-[13px] text-(--color-ink-faint)">Conversion HEIC…</p>
          )}

          {(sourceType !== 'pdf' || pdfPageCount === 1) && (sourceType !== 'heic' || heicAsset) && (
            <ModeSelector value={editMode} onChange={handleModeChange} />
          )}

          {sourceType === 'pdf' && pdfPageCount !== null && pdfPageCount > 1 && (
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => handleModeChange('convert')}
                className={`rounded-full px-4 py-2 text-[13px] transition-colors ${
                  editMode === 'convert'
                    ? 'bg-(--color-accent) font-medium text-(--color-card)'
                    : 'border border-(--color-line) text-(--color-ink-soft) hover:border-(--color-accent)/50'
                }`}
              >
                Convertir en images
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('split')}
                className={`rounded-full px-4 py-2 text-[13px] transition-colors ${
                  editMode === 'split'
                    ? 'bg-(--color-accent) font-medium text-(--color-card)'
                    : 'border border-(--color-line) text-(--color-ink-soft) hover:border-(--color-accent)/50'
                }`}
              >
                Découper
              </button>
            </div>
          )}

          {editMode === 'split' && sourceType === 'pdf' && pdfPageCount !== null ? (
            <SplitTool file={file} pageCount={pdfPageCount} onApply={handleToolApplied} />
          ) : editMode === 'remove-bg' ? (
            <RemoveBackgroundTool
              imageUrl={pdfPageAsset ? pdfPageAsset.url : heicAsset ? heicAsset.url : originalUrl}
              file={pdfPageAsset ? pdfPageAsset.file : heicAsset ? heicAsset.file : file}
              onApply={handleToolApplied}
            />
          ) : editMode === 'resize' ? (
            <ResizeTool
              imageUrl={pdfPageAsset ? pdfPageAsset.url : heicAsset ? heicAsset.url : originalUrl}
              sourceFormat={resizeSourceFormat}
              onApply={handleToolApplied}
            />
          ) : editMode === 'convert' ? (
            <div className="flex flex-col gap-6 sm:flex-row sm:items-stretch">
              <PreviewPanel
                originalUrl={heicAsset ? heicAsset.url : originalUrl}
                originalIsImage={sourceType !== 'pdf' && (sourceType !== 'heic' || !!heicAsset)}
                originalLabel="Original"
                originalFormatLabel={sourceType.toUpperCase()}
                originalSize={file.size}
                resultUrl={resultUrl}
                resultIsImage={resultBlob ? resultBlob.type.startsWith('image/') : false}
                resultLabel="Résultat"
                resultFormatLabel={resultFormatLabel}
                resultSize={resultBlob?.size ?? null}
                isProcessing={isProcessing}
              >
                <ToolSelector value={targetFormat} onChange={setTargetFormat} sourceType={sourceType} />
              </PreviewPanel>
            </div>
          ) : (
            <CropTool
              imageUrl={pdfPageAsset ? pdfPageAsset.url : heicAsset ? heicAsset.url : originalUrl}
              mimeType={
                sourceType === 'pdf' || sourceType === 'heic' ? 'image/png' : MIME_BY_DETECTED[sourceType]
              }
              onApply={handleToolApplied}
            />
          )}

          <ExportButton blob={resultBlob} fileName={exportFileName} isProcessing={isProcessing} />
        </div>
      )}
    </div>
  )
}

export default App
