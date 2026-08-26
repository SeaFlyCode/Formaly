import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./components/CropTool', () => ({
  CropTool: (props: { onApply: (blob: Blob) => void }) => (
    <button onClick={() => props.onApply(new Blob(['cropped'], { type: 'image/png' }))}>
      stub-crop-apply
    </button>
  ),
}))
vi.mock('./components/ResizeTool', () => ({
  ResizeTool: (props: { onApply: (blob: Blob) => void }) => (
    <button onClick={() => props.onApply(new Blob(['resized'], { type: 'image/webp' }))}>
      stub-resize-apply
    </button>
  ),
}))
vi.mock('./components/RemoveBackgroundTool', () => ({
  RemoveBackgroundTool: (props: { onApply: (blob: Blob) => void }) => (
    <button onClick={() => props.onApply(new Blob(['nobg'], { type: 'image/png' }))}>
      stub-removebg-apply
    </button>
  ),
}))
vi.mock('./components/SplitTool', () => ({
  SplitTool: (props: { onApply: (blob: Blob) => void }) => (
    <button onClick={() => props.onApply(new Blob(['split'], { type: 'application/pdf' }))}>
      stub-split-apply
    </button>
  ),
}))
vi.mock('./components/MergeTool', () => ({
  MergeTool: () => <div>stub-merge-tool</div>,
}))
vi.mock('./lib/heic-convert', () => ({
  convertHeicToPng: vi.fn(() => Promise.resolve(new Blob(['heic-png'], { type: 'image/png' }))),
}))
vi.mock('./lib/pdf-to-images', () => ({
  inspectPdf: vi.fn(),
  convertPdfToImages: vi.fn(() => Promise.resolve(new Blob(['pdf-png'], { type: 'image/png' }))),
}))

class MockWorker {
  static instances: MockWorker[] = []
  private listeners: Record<string, ((event: MessageEvent) => void)[]> = { message: [] }
  postMessage = vi.fn()
  terminate = vi.fn()

  constructor() {
    MockWorker.instances.push(this)
  }

  addEventListener(type: string, callback: (event: MessageEvent) => void) {
    this.listeners[type] ??= []
    this.listeners[type].push(callback)
  }

  removeEventListener(type: string, callback: (event: MessageEvent) => void) {
    this.listeners[type] = (this.listeners[type] ?? []).filter((cb) => cb !== callback)
  }

  emitMessage(data: unknown) {
    this.listeners.message.forEach((cb) => cb({ data } as MessageEvent))
  }

  static latest() {
    return MockWorker.instances[MockWorker.instances.length - 1]
  }
}

function pngFile(name = 'photo.png'): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], name, {
    type: 'image/png',
  })
}

function pdfFile(name = 'doc.pdf'): File {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])], name, {
    type: 'application/pdf',
  })
}

function heicFile(name = 'photo.heic'): File {
  const bytes = [0x00, 0x00, 0x00, 0x18, ...'ftyp'.split('').map((c) => c.charCodeAt(0)), ...'heic'.split('').map((c) => c.charCodeAt(0))]
  return new File([new Uint8Array(bytes)], name, { type: 'image/heic' })
}

function getFileInput(): HTMLInputElement {
  return document.querySelector('input[type="file"]') as HTMLInputElement
}

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('Worker', MockWorker)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    MockWorker.instances = []
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('shows the landing hero and dropzone when no file is selected', () => {
    render(<App />)
    expect(screen.getByText(/Convertissez vos fichiers/)).toBeInTheDocument()
    expect(screen.getByText('Traitement 100% local')).toBeInTheDocument()
  })

  it('shows an error for an unrecognized file format', async () => {
    render(<App />)

    const bogus = new File([new Uint8Array([1, 2, 3, 4])], 'file.bin')
    fireEvent.change(getFileInput(), { target: { files: [bogus] } })

    expect(
      await screen.findByText(/Format non reconnu/),
    ).toBeInTheDocument()
  })

  it('toggles the merge view and back', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByText(/fusionnez plusieurs PDF/i))
    expect(screen.getByText('stub-merge-tool')).toBeInTheDocument()

    await user.click(screen.getByText('Retour'))
    expect(screen.queryByText('stub-merge-tool')).not.toBeInTheDocument()
  })

  it('converts a PNG file via the worker and enables export on success', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.upload(getFileInput(), pngFile())

    await waitFor(() => expect(MockWorker.latest()?.postMessage).toHaveBeenCalled())
    const resultBlob = new Blob(['converted'], { type: 'image/jpeg' })
    MockWorker.latest().emitMessage({ type: 'processing-success', blob: resultBlob })

    await waitFor(() => expect(screen.getByText('photo.jpg')).toBeInTheDocument())
  })

  it('shows a processing error message from the worker', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.upload(getFileInput(), pngFile())
    await waitFor(() => expect(MockWorker.latest()?.postMessage).toHaveBeenCalled())
    MockWorker.latest().emitMessage({ type: 'processing-error', message: 'Échec du traitement' })

    expect(await screen.findByText('Échec du traitement')).toBeInTheDocument()
  })

  it('applies a crop and reflects it in the exported file name', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.upload(getFileInput(), pngFile())
    await waitFor(() => expect(MockWorker.latest()?.postMessage).toHaveBeenCalled())

    await user.click(screen.getByText('Rogner'))
    await user.click(screen.getByText('stub-crop-apply'))

    await waitFor(() => expect(screen.getByText('photo.png')).toBeInTheDocument())
  })

  it('applies a resize and labels the export with the resized format', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.upload(getFileInput(), pngFile())
    await waitFor(() => expect(MockWorker.latest()?.postMessage).toHaveBeenCalled())

    await user.click(screen.getByText('Compresser / Redimensionner'))
    await user.click(screen.getByText('stub-resize-apply'))

    await waitFor(() => expect(screen.getByText('photo.webp')).toBeInTheDocument())
  })

  it('handles a multi-page PDF: shows convert/split toggle and applies a split', async () => {
    const { inspectPdf } = await import('./lib/pdf-to-images')
    vi.mocked(inspectPdf).mockResolvedValue({ pageCount: 3, firstPageBlob: null })
    const user = userEvent.setup()
    render(<App />)

    await user.upload(getFileInput(), pdfFile())

    expect(await screen.findByText('Découper')).toBeInTheDocument()
    await user.click(screen.getByText('Découper'))
    await user.click(screen.getByText('stub-split-apply'))

    await waitFor(() => expect(screen.getByText('doc.pdf')).toBeInTheDocument())
  })

  it('converts a single-page PDF to an image through the worker-free PDF path', async () => {
    const { inspectPdf } = await import('./lib/pdf-to-images')
    vi.mocked(inspectPdf).mockResolvedValue({
      pageCount: 1,
      firstPageBlob: new Blob(['page'], { type: 'image/png' }),
    })
    const user = userEvent.setup()
    render(<App />)

    await user.upload(getFileInput(), pdfFile())

    await waitFor(() => expect(screen.getByText('doc.png')).toBeInTheDocument())
  })

  it('converts a HEIC file to PNG before further processing', async () => {
    const { convertHeicToPng } = await import('./lib/heic-convert')
    const user = userEvent.setup()
    render(<App />)

    await user.upload(getFileInput(), heicFile())

    await waitFor(() => expect(convertHeicToPng).toHaveBeenCalled())
    expect(screen.queryByText('Conversion HEIC…')).not.toBeInTheDocument()
  })

  it('resets to the landing screen', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.upload(getFileInput(), pngFile())
    await waitFor(() => expect(screen.getByText('Changer de fichier')).toBeInTheDocument())

    await user.click(screen.getByText('Changer de fichier'))

    expect(screen.getByText(/Convertissez vos fichiers/)).toBeInTheDocument()
  })
})
