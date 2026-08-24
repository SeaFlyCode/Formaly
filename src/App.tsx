import { useEffect, useRef, useState } from 'react'
import { Dropzone } from './components/Dropzone'
import { ToolSelector } from './components/ToolSelector'
import { PreviewPanel } from './components/PreviewPanel'
import { ExportButton } from './components/ExportButton'
import { detectImageType, type DetectedImageType } from './lib/file-type-detector'
import type {
  ConvertImageError,
  ConvertImageRequest,
  ConvertImageSuccess,
  ImageTargetFormat,
} from './workers/processing.worker'

const MIME_BY_DETECTED: Record<DetectedImageType, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
}

function App() {
  const workerRef = useRef<Worker | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [sourceType, setSourceType] = useState<DetectedImageType | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [targetFormat, setTargetFormat] = useState<ImageTargetFormat>('jpeg')
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

    const detected = await detectImageType(selected)
    if (!detected) {
      setError('Format non reconnu — seuls PNG et JPEG sont supportés pour le moment.')
      return
    }

    setFile(selected)
    setSourceType(detected)
    setOriginalUrl(URL.createObjectURL(selected))
    setTargetFormat(detected === 'png' ? 'jpeg' : 'png')
  }

  useEffect(() => {
    if (!file || !sourceType || !workerRef.current) return

    const worker = workerRef.current
    setIsProcessing(true)
    setError(null)

    function handleMessage(event: MessageEvent<ConvertImageSuccess | ConvertImageError>) {
      if (event.data.type === 'convert-image-success') {
        setResultBlob(event.data.blob)
        setResultUrl(URL.createObjectURL(event.data.blob))
      } else {
        setError(event.data.message)
      }
      setIsProcessing(false)
    }

    worker.addEventListener('message', handleMessage)

    file.arrayBuffer().then((buffer) => {
      const request: ConvertImageRequest = {
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

  const exportFileName = file
    ? `${file.name.replace(/\.[^.]+$/, '')}.${targetFormat === 'jpeg' ? 'jpg' : 'png'}`
    : 'converted'

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-10 px-6 py-16 sm:py-24">
      <header className="flex flex-col gap-2">
        <span className="font-mono text-xs uppercase tracking-[0.4em] text-(--color-signal)">
          Local · Privé · Gratuit
        </span>
        <h1 className="font-display text-6xl italic sm:text-7xl">Formaly</h1>
        <p className="max-w-md text-sm text-white/50">
          Convertissez vos images sans qu'elles quittent jamais votre appareil. Tout le
          traitement a lieu dans votre navigateur.
        </p>
      </header>

      {!file && <Dropzone accept="image/png,image/jpeg" onFileSelected={handleFileSelected} />}

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 font-mono text-sm text-red-300">
          {error}
        </p>
      )}

      {file && originalUrl && sourceType && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <ToolSelector value={targetFormat} onChange={setTargetFormat} disabledFormat={sourceType} />
            <button
              type="button"
              onClick={() => {
                setFile(null)
                setSourceType(null)
                setOriginalUrl(null)
                setResultUrl(null)
                setResultBlob(null)
                setError(null)
              }}
              className="font-mono text-xs uppercase tracking-[0.2em] text-white/40 hover:text-white"
            >
              Changer de fichier
            </button>
          </div>

          <PreviewPanel
            originalUrl={originalUrl}
            originalLabel={`Original — ${sourceType.toUpperCase()}`}
            resultUrl={resultUrl}
            resultLabel={`Résultat — ${targetFormat.toUpperCase()}`}
            isProcessing={isProcessing}
          />

          <ExportButton blob={resultBlob} fileName={exportFileName} isProcessing={isProcessing} />
        </div>
      )}
    </div>
  )
}

export default App
