import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CompressTool } from './CompressTool'
import { compressPdf, renderFirstPageJpeg } from '../lib/pdf-to-images'

vi.mock('../lib/pdf-to-images', () => ({
  renderFirstPageJpeg: vi.fn(),
  compressPdf: vi.fn(),
}))

function pdfFile(): File {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'doc.pdf', { type: 'application/pdf' })
}

describe('CompressTool', () => {
  beforeEach(() => {
    vi.mocked(renderFirstPageJpeg).mockResolvedValue(new Blob(['jpeg'], { type: 'image/jpeg' }))
    vi.mocked(compressPdf).mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading state, then the rasterized first-page preview', async () => {
    render(<CompressTool file={pdfFile()} onApply={vi.fn()} />)

    expect(screen.getByText("Génération de l'aperçu…")).toBeInTheDocument()

    await waitFor(() => expect(renderFirstPageJpeg).toHaveBeenCalledWith(expect.any(ArrayBuffer), 0.6), {
      timeout: 1000,
    })
    await waitFor(() => expect(screen.getByAltText('Aperçu (1ère page)')).toBeInTheDocument())
  })

  it('re-renders the preview when the quality slider changes', async () => {
    render(<CompressTool file={pdfFile()} onApply={vi.fn()} />)
    await waitFor(() => expect(renderFirstPageJpeg).toHaveBeenCalledTimes(1), { timeout: 1000 })

    fireEvent.change(screen.getByRole('slider'), { target: { value: '20' } })

    await waitFor(() => expect(renderFirstPageJpeg).toHaveBeenCalledTimes(2), { timeout: 1000 })
    expect(renderFirstPageJpeg).toHaveBeenLastCalledWith(expect.any(ArrayBuffer), 0.2)
  })

  it('calls onApply with the compressed PDF blob and shows the new size', async () => {
    const onApply = vi.fn()
    const user = userEvent.setup()
    render(<CompressTool file={pdfFile()} onApply={onApply} />)

    await user.click(screen.getByText('Compresser'))

    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1))
    expect(await screen.findByText(/Nouveau poids/)).toBeInTheDocument()
  })
})
