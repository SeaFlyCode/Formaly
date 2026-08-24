import { useEffect, useRef, useState } from 'react'
import { Dropzone } from './components/Dropzone'
import { ToolSelector, type TargetFormat } from './components/ToolSelector'
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
  const [targetFormat, setTargetFormat] = useState<TargetFormat>('jpeg')
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  async function handleFileSelected(selected: File) {
    setError(null)
    setResultUrl(null)
    setResultBlob(null)

    const detected = await detectFileType(selected)
    if (!detected) {
      setError('Format non reconnu — seuls PNG, JPEG, WebP et PDF sont supportés pour le moment.')
      return
    }

    setFile(selected)
    setSourceType(detected)
    setOriginalUrl(URL.createObjectURL(selected))
    setTargetFormat(detected === 'pdf' ? 'png' : detected === 'png' ? 'jpeg' : 'png')
  }

  useEffect(() => {
    if (!file || !sourceType) return

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

    file.arrayBuffer().then((buffer) => {
      const request: ProcessingRequest =
        targetFormat === 'pdf'
          ? { type: 'image-to-pdf', file: buffer, sourceMimeType: MIME_BY_DETECTED[sourceType] }
          : {
              type: 'convert-image',
              file: buffer,
              sourceMimeType: MIME_BY_DETECTED[sourceType],
              targetFormat,
            }
      worker.postMessage(request, [buffer])
    })

    return () => worker.removeEventListener('message', handleMessage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, sourceType, targetFormat])

  const resultExtension =
    resultBlob?.type === 'application/zip' ? 'zip' : EXTENSION_BY_FORMAT[targetFormat]
  const exportFileName = file
    ? `${file.name.replace(/\.[^.]+$/, '')}.${resultExtension}`
    : 'converted'
  const resultFormatLabel = resultBlob?.type === 'application/zip' ? 'ZIP' : targetFormat.toUpperCase()

  function handleReset() {
    setFile(null)
    setSourceType(null)
    setOriginalUrl(null)
    setResultUrl(null)
    setResultBlob(null)
    setError(null)
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
        ) : (
          <div className="flex items-center gap-2.5 text-xs tracking-[0.08em] text-(--color-ink-soft) uppercase">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-(--color-accent)" />
            Traitement 100% local
          </div>
        )}
      </header>

      {!file && (
        <div className="flex flex-1 flex-col items-center justify-center gap-11 py-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="font-display max-w-2xl text-4xl leading-[1.1] font-medium tracking-tight sm:text-5xl">
              Convertissez vos fichiers sans qu'ils quittent votre appareil.
            </h1>
            <p className="max-w-md text-[17px] text-(--color-ink-soft)">
              PNG, JPEG, WebP, PDF — gratuit, sans compte, sans limite. Tout se passe dans votre
              navigateur.
            </p>
          </div>

          <Dropzone
            accept="image/png,image/jpeg,image/webp,application/pdf"
            onFileSelected={handleFileSelected}
          />

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
          <div className="flex flex-col gap-6 sm:flex-row sm:items-stretch">
            <PreviewPanel
              originalUrl={originalUrl}
              originalIsImage={sourceType !== 'pdf'}
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

          <ExportButton blob={resultBlob} fileName={exportFileName} isProcessing={isProcessing} />
        </div>
      )}
    </div>
  )
}

export default App
