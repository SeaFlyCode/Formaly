import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Dropzone } from './components/Dropzone'
import { ToolSelector, type TargetFormat } from './components/ToolSelector'
import { ModeSelector, type EditMode } from './components/ModeSelector'
import type { ResizeOutputFormat } from './lib/resize-image'
import { PreviewPanel } from './components/PreviewPanel'
import { ExportButton } from './components/ExportButton'
import { detectFileType, NORMALIZABLE_TYPES, type DetectedFileType } from './lib/file-type-detector'
import { checkBrowserSupport } from './lib/check-browser-support'
import type {
  ImageTargetFormat,
  ProcessingError,
  ProcessingRequest,
  ProcessingSuccess,
} from './workers/processing.worker'

const CropTool = lazy(() => import('./components/CropTool').then((m) => ({ default: m.CropTool })))
const RemoveBackgroundTool = lazy(() =>
  import('./components/RemoveBackgroundTool').then((m) => ({ default: m.RemoveBackgroundTool })),
)
const ResizeTool = lazy(() => import('./components/ResizeTool').then((m) => ({ default: m.ResizeTool })))
const SplitTool = lazy(() => import('./components/SplitTool').then((m) => ({ default: m.SplitTool })))
const MergeTool = lazy(() => import('./components/MergeTool').then((m) => ({ default: m.MergeTool })))
const OcrTool = lazy(() => import('./components/OcrTool').then((m) => ({ default: m.OcrTool })))
const RotateTool = lazy(() => import('./components/RotateTool').then((m) => ({ default: m.RotateTool })))
const ReorderTool = lazy(() =>
  import('./components/ReorderTool').then((m) => ({ default: m.ReorderTool })),
)
const WatermarkTool = lazy(() =>
  import('./components/WatermarkTool').then((m) => ({ default: m.WatermarkTool })),
)
const PdfWatermarkTool = lazy(() =>
  import('./components/PdfWatermarkTool').then((m) => ({ default: m.PdfWatermarkTool })),
)
const CompressTool = lazy(() =>
  import('./components/CompressTool').then((m) => ({ default: m.CompressTool })),
)
const PdfTextTool = lazy(() =>
  import('./components/PdfTextTool').then((m) => ({ default: m.PdfTextTool })),
)

const MIME_BY_DETECTED: Record<DetectedFileType, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  pdf: 'application/pdf',
  heic: 'image/heic',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  gif: 'image/gif',
  tiff: 'image/tiff',
}

const EXTENSION_BY_FORMAT: Record<TargetFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
  pdf: 'pdf',
  avif: 'avif',
  bmp: 'bmp',
  ico: 'ico',
  tiff: 'tiff',
}

type ExoticTargetFormat = 'avif' | 'bmp' | 'ico' | 'tiff'

function isImageTargetFormat(format: TargetFormat): format is ImageTargetFormat {
  return format === 'png' || format === 'jpeg' || format === 'webp'
}

function isExoticTargetFormat(format: TargetFormat): format is ExoticTargetFormat {
  return format === 'avif' || format === 'bmp' || format === 'ico' || format === 'tiff'
}

/** Formats sans support d'encodage natif Canvas — normalisés en PNG avant tout traitement. */
function needsNormalization(type: DetectedFileType): boolean {
  return type === 'heic' || NORMALIZABLE_TYPES.includes(type)
}

async function convertToExoticFormat(source: File, format: ExoticTargetFormat): Promise<Blob> {
  switch (format) {
    case 'avif': {
      const { encodeToAvif } = await import('./lib/avif-convert')
      return encodeToAvif(source)
    }
    case 'bmp': {
      const { encodeToBmp } = await import('./lib/bmp-convert')
      return encodeToBmp(source)
    }
    case 'ico': {
      const { encodeToIco } = await import('./lib/ico-convert')
      return encodeToIco(source)
    }
    case 'tiff': {
      const { encodeToTiff } = await import('./lib/tiff-convert')
      return encodeToTiff(source)
    }
  }
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
  const [normalizedAsset, setNormalizedAsset] = useState<{ url: string; file: File } | null>(null)
  const [isPreparingNormalized, setIsPreparingNormalized] = useState(false)
  const [showMerge, setShowMerge] = useState(false)
  const [browserSupport] = useState(() => checkBrowserSupport())

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
    return () => {
      if (normalizedAsset) URL.revokeObjectURL(normalizedAsset.url)
    }
  }, [normalizedAsset])

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
    if (!file || !sourceType || !NORMALIZABLE_TYPES.includes(sourceType)) return

    let cancelled = false
    setIsPreparingNormalized(true)
    setNormalizedAsset(null)

    normalizeFile(file, sourceType)

    async function normalizeFile(source: File, type: DetectedFileType) {
      try {
        const pngBlob =
          type === 'tiff'
            ? await source.arrayBuffer().then(async (buffer) => {
                const { decodeTiffToPngBlob } = await import('./lib/tiff-convert')
                return decodeTiffToPngBlob(buffer)
              })
            : await import('./lib/image-codecs').then(({ decodeImageFileToPngBlob }) =>
                decodeImageFileToPngBlob(source),
              )
        if (cancelled) return
        const baseName = source.name.replace(/\.[^.]+$/, '')
        const pngFile = new File([pngBlob], `${baseName}.png`, { type: 'image/png' })
        setNormalizedAsset({ url: URL.createObjectURL(pngFile), file: pngFile })
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Conversion échouée')
      } finally {
        if (!cancelled) setIsPreparingNormalized(false)
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
      } catch (err) {
        if (!cancelled) {
          setPdfPageCount(null)
          setError(err instanceof Error ? err.message : 'Impossible de lire ce PDF.')
        }
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
      setError(
        'Format non reconnu — seuls PNG, JPEG, WebP, AVIF, BMP, ICO, TIFF, GIF, SVG, PDF et HEIC sont supportés pour le moment.',
      )
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
    const normalizedSourceAsset = heicAsset ?? normalizedAsset

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

    if (needsNormalization(sourceType) && !normalizedSourceAsset) return

    const sourceFile = normalizedSourceAsset ? normalizedSourceAsset.file : file

    if (isExoticTargetFormat(targetFormat)) {
      let cancelled = false

      convertToExoticFormat(sourceFile, targetFormat).then((blob) => {
        if (cancelled) return
        setResultBlob(blob)
        setResultUrl(URL.createObjectURL(blob))
      }).catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Conversion échouée')
      }).finally(() => {
        if (!cancelled) setIsProcessing(false)
      })

      return () => {
        cancelled = true
      }
    }

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

    const sourceMimeType = normalizedSourceAsset ? 'image/png' : MIME_BY_DETECTED[sourceType]

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
  }, [file, sourceType, targetFormat, editMode, heicAsset, normalizedAsset])

  const cropSourceFormat: 'png' | 'jpeg' | 'webp' | null = !sourceType
    ? null
    : sourceType === 'jpeg' || sourceType === 'webp'
      ? sourceType
      : 'png'
  const resizeSourceFormat: ResizeOutputFormat = cropSourceFormat === 'jpeg' || cropSourceFormat === 'webp' ? cropSourceFormat : 'png'
  const PDF_WHOLE_DOC_MODES: EditMode[] = ['split', 'rotate', 'reorder', 'compress', 'watermark-pdf']
  const resultExtension =
    resultBlob?.type === 'application/zip'
      ? 'zip'
      : editMode === 'remove-bg' || editMode === 'watermark'
        ? 'png'
        : PDF_WHOLE_DOC_MODES.includes(editMode)
          ? 'pdf'
          : editMode === 'ocr' || editMode === 'extract-text'
            ? 'txt'
            : editMode === 'resize' && resultBlob
              ? (resultBlob.type.split('/')[1] === 'jpeg' ? 'jpg' : resultBlob.type.split('/')[1])
              : EXTENSION_BY_FORMAT[editMode === 'crop' && cropSourceFormat ? cropSourceFormat : targetFormat]
  const exportFileName = file
    ? `${file.name.replace(/\.[^.]+$/, '')}.${resultExtension}`
    : 'converted'
  const resultFormatLabel =
    resultBlob?.type === 'application/zip'
      ? 'ZIP'
      : editMode === 'remove-bg' || editMode === 'watermark'
        ? 'PNG'
        : PDF_WHOLE_DOC_MODES.includes(editMode)
          ? 'PDF'
          : editMode === 'ocr' || editMode === 'extract-text'
            ? 'TXT'
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
    setNormalizedAsset(null)
    setIsPreparingNormalized(false)
  }

  const normalizedSourceAsset = heicAsset ?? normalizedAsset

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

      {!browserSupport.supported && (
        <p className="rounded-xl border border-amber-700/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800/80">
          {browserSupport.message}
        </p>
      )}

      {!file && showMerge && (
        <Suspense fallback={<p className="text-center text-[13px] text-(--color-ink-faint)">Chargement…</p>}>
          <MergeTool />
        </Suspense>
      )}

      {!file && !showMerge && (
        <div className="flex flex-1 flex-col items-center justify-center gap-11 py-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="font-display max-w-2xl text-4xl leading-[1.1] font-medium tracking-tight sm:text-5xl">
              Convertissez vos fichiers sans qu'ils quittent votre appareil.
            </h1>
            <p className="max-w-md text-[17px] text-(--color-ink-soft)">
              PNG, JPEG, WebP, AVIF, BMP, ICO, TIFF, GIF, SVG, PDF, HEIC — gratuit, sans compte, sans
              limite. Tout se passe dans votre navigateur.
            </p>
          </div>

          <Dropzone
            accept="image/png,image/jpeg,image/webp,application/pdf,image/heic,image/heif,image/avif,image/bmp,image/x-icon,image/vnd.microsoft.icon,image/gif,image/tiff,image/svg+xml"
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

          {sourceType && NORMALIZABLE_TYPES.includes(sourceType) && isPreparingNormalized && (
            <p className="text-center text-[13px] text-(--color-ink-faint)">Conversion en cours…</p>
          )}

          {(sourceType !== 'pdf' || pdfPageCount === 1) &&
            (!sourceType || !needsNormalization(sourceType) || normalizedSourceAsset) && (
              <ModeSelector value={editMode} onChange={handleModeChange} />
            )}

          {sourceType === 'pdf' && pdfPageCount !== null && (
            <div className="flex flex-wrap justify-center gap-2">
              {(
                [
                  { mode: 'convert', label: 'Convertir en images', show: true },
                  { mode: 'split', label: 'Découper', show: pdfPageCount > 1 },
                  { mode: 'reorder', label: 'Réorganiser', show: pdfPageCount > 1 },
                  { mode: 'rotate', label: 'Rotation', show: true },
                  // Sur un PDF mono-page, le filigrane passe déjà par ModeSelector (mode
                  // 'watermark', chemin image identique à crop/resize) — éviter le doublon.
                  { mode: 'watermark-pdf', label: 'Filigrane', show: pdfPageCount > 1 },
                  { mode: 'compress', label: 'Compresser', show: true },
                  { mode: 'extract-text', label: 'Texte du PDF', show: true },
                ] as { mode: EditMode; label: string; show: boolean }[]
              )
                .filter((action) => action.show)
                .map(({ mode, label }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleModeChange(mode)}
                    className={`rounded-full px-4 py-2 text-[13px] transition-colors ${
                      editMode === mode
                        ? 'bg-(--color-accent) font-medium text-(--color-card)'
                        : 'border border-(--color-line) text-(--color-ink-soft) hover:border-(--color-accent)/50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
            </div>
          )}

          {editMode === 'split' && sourceType === 'pdf' && pdfPageCount !== null ? (
            <Suspense fallback={<p className="text-center text-[13px] text-(--color-ink-faint)">Chargement…</p>}>
              <SplitTool file={file} pageCount={pdfPageCount} onApply={handleToolApplied} />
            </Suspense>
          ) : editMode === 'reorder' && sourceType === 'pdf' && pdfPageCount !== null ? (
            <Suspense fallback={<p className="text-center text-[13px] text-(--color-ink-faint)">Chargement…</p>}>
              <ReorderTool file={file} pageCount={pdfPageCount} onApply={handleToolApplied} />
            </Suspense>
          ) : editMode === 'rotate' && sourceType === 'pdf' ? (
            <Suspense fallback={<p className="text-center text-[13px] text-(--color-ink-faint)">Chargement…</p>}>
              <RotateTool file={file} onApply={handleToolApplied} />
            </Suspense>
          ) : editMode === 'watermark-pdf' && sourceType === 'pdf' ? (
            <Suspense fallback={<p className="text-center text-[13px] text-(--color-ink-faint)">Chargement…</p>}>
              <PdfWatermarkTool file={file} onApply={handleToolApplied} />
            </Suspense>
          ) : editMode === 'compress' && sourceType === 'pdf' ? (
            <Suspense fallback={<p className="text-center text-[13px] text-(--color-ink-faint)">Chargement…</p>}>
              <CompressTool file={file} onApply={handleToolApplied} />
            </Suspense>
          ) : editMode === 'extract-text' && sourceType === 'pdf' ? (
            <Suspense fallback={<p className="text-center text-[13px] text-(--color-ink-faint)">Chargement…</p>}>
              <PdfTextTool file={file} onApply={handleToolApplied} />
            </Suspense>
          ) : editMode === 'watermark' ? (
            <Suspense fallback={<p className="text-center text-[13px] text-(--color-ink-faint)">Chargement…</p>}>
              <WatermarkTool
                imageUrl={pdfPageAsset ? pdfPageAsset.url : normalizedSourceAsset ? normalizedSourceAsset.url : originalUrl}
                onApply={handleToolApplied}
              />
            </Suspense>
          ) : editMode === 'remove-bg' ? (
            <Suspense fallback={<p className="text-center text-[13px] text-(--color-ink-faint)">Chargement…</p>}>
              <RemoveBackgroundTool
                imageUrl={pdfPageAsset ? pdfPageAsset.url : normalizedSourceAsset ? normalizedSourceAsset.url : originalUrl}
                file={pdfPageAsset ? pdfPageAsset.file : normalizedSourceAsset ? normalizedSourceAsset.file : file}
                onApply={handleToolApplied}
              />
            </Suspense>
          ) : editMode === 'resize' ? (
            <Suspense fallback={<p className="text-center text-[13px] text-(--color-ink-faint)">Chargement…</p>}>
              <ResizeTool
                imageUrl={pdfPageAsset ? pdfPageAsset.url : normalizedSourceAsset ? normalizedSourceAsset.url : originalUrl}
                sourceFormat={resizeSourceFormat}
                onApply={handleToolApplied}
              />
            </Suspense>
          ) : editMode === 'ocr' ? (
            <Suspense fallback={<p className="text-center text-[13px] text-(--color-ink-faint)">Chargement…</p>}>
              <OcrTool
                imageUrl={pdfPageAsset ? pdfPageAsset.url : normalizedSourceAsset ? normalizedSourceAsset.url : originalUrl}
                onApply={handleToolApplied}
              />
            </Suspense>
          ) : editMode === 'convert' ? (
            <div className="flex flex-col gap-6 sm:flex-row sm:items-stretch">
              <PreviewPanel
                originalUrl={normalizedSourceAsset ? normalizedSourceAsset.url : originalUrl}
                originalIsImage={sourceType !== 'pdf' && (!needsNormalization(sourceType) || !!normalizedSourceAsset)}
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
            <Suspense fallback={<p className="text-center text-[13px] text-(--color-ink-faint)">Chargement…</p>}>
              <CropTool
                imageUrl={pdfPageAsset ? pdfPageAsset.url : normalizedSourceAsset ? normalizedSourceAsset.url : originalUrl}
                mimeType={
                  sourceType === 'pdf' || needsNormalization(sourceType) ? 'image/png' : MIME_BY_DETECTED[sourceType]
                }
                onApply={handleToolApplied}
              />
            </Suspense>
          )}

          <ExportButton blob={resultBlob} fileName={exportFileName} isProcessing={isProcessing} />
        </div>
      )}
    </div>
  )
}

export default App
