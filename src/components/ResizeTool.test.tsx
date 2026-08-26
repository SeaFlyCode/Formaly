import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ResizeTool } from './ResizeTool'
import { resizeImageToBlob } from '../lib/resize-image'

vi.mock('../lib/resize-image', async () => {
  const actual = await vi.importActual<typeof import('../lib/resize-image')>('../lib/resize-image')
  return { ...actual, resizeImageToBlob: vi.fn() }
})

function mockImage() {
  class MockImage {
    onload: (() => void) | null = null
    naturalWidth = 400
    naturalHeight = 200
    set src(_value: string) {
      queueMicrotask(() => this.onload?.())
    }
  }
  vi.stubGlobal('Image', MockImage)
}

describe('ResizeTool', () => {
  beforeEach(() => {
    mockImage()
    vi.mocked(resizeImageToBlob).mockResolvedValue(new Blob(['x'.repeat(2048)]))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('prefills width/height from the natural image size', async () => {
    render(<ResizeTool imageUrl="data:image/png;base64,x" sourceFormat="png" onApply={vi.fn()} />)

    await waitFor(() => expect(screen.getByLabelText('Largeur (px)')).toHaveValue(400))
    expect(screen.getByLabelText('Hauteur (px)')).toHaveValue(200)
  })

  it('keeps the aspect ratio locked by default when width changes', async () => {
    const user = userEvent.setup()
    render(<ResizeTool imageUrl="data:image/png;base64,x" sourceFormat="png" onApply={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('Largeur (px)')).toHaveValue(400))

    await user.clear(screen.getByLabelText('Largeur (px)'))
    await user.type(screen.getByLabelText('Largeur (px)'), '200')

    expect(screen.getByLabelText('Hauteur (px)')).toHaveValue(100)
  })

  it('hides the quality slider for PNG output', async () => {
    render(<ResizeTool imageUrl="data:image/png;base64,x" sourceFormat="png" onApply={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('Largeur (px)')).toHaveValue(400))

    expect(screen.queryByText('Qualité de compression')).not.toBeInTheDocument()
  })

  it('shows the quality slider once a lossy format is selected', async () => {
    const user = userEvent.setup()
    render(<ResizeTool imageUrl="data:image/png;base64,x" sourceFormat="png" onApply={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('Largeur (px)')).toHaveValue(400))

    await user.click(screen.getByText('JPEG'))

    expect(screen.getByText('Qualité de compression')).toBeInTheDocument()
  })

  it('shows the estimated size after the debounced resize resolves', async () => {
    render(<ResizeTool imageUrl="data:image/png;base64,x" sourceFormat="png" onApply={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('Largeur (px)')).toHaveValue(400))

    await waitFor(() => expect(screen.getByText(/Poids estimé/)).toBeInTheDocument(), { timeout: 1000 })
  })

  it('calls onApply with the resized blob', async () => {
    const onApply = vi.fn()
    const user = userEvent.setup()
    render(<ResizeTool imageUrl="data:image/png;base64,x" sourceFormat="png" onApply={onApply} />)
    await waitFor(() => expect(screen.getByLabelText('Largeur (px)')).toHaveValue(400))

    await user.click(screen.getByText('Appliquer'))

    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1))
  })

  it('shows an error message when resizing fails on apply', async () => {
    vi.mocked(resizeImageToBlob).mockReset()
    vi.mocked(resizeImageToBlob).mockRejectedValue(new Error('fail'))
    const user = userEvent.setup()
    render(<ResizeTool imageUrl="data:image/png;base64,x" sourceFormat="png" onApply={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('Largeur (px)')).toHaveValue(400))

    await user.click(screen.getByText('Appliquer'))

    expect(await screen.findByText('Redimensionnement échoué — réessayez.')).toBeInTheDocument()
  })
})
