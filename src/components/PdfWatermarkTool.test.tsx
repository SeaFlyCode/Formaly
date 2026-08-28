import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PdfWatermarkTool } from './PdfWatermarkTool'
import { watermarkImage, watermarkPdf } from '../lib/watermark'

vi.mock('../lib/watermark', () => ({
  watermarkImage: vi.fn(),
  watermarkPdf: vi.fn(),
}))
vi.mock('../lib/pdf-to-images', () => ({
  renderPdfThumbnails: vi.fn(() => Promise.resolve([new Blob(['thumb'], { type: 'image/jpeg' })])),
}))

function pdfFile(): File {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'doc.pdf', { type: 'application/pdf' })
}

describe('PdfWatermarkTool', () => {
  beforeEach(() => {
    vi.mocked(watermarkImage).mockResolvedValue(new Blob(['x'], { type: 'image/png' }))
    vi.mocked(watermarkPdf).mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading state, then the first-page thumbnail, then the watermarked preview', async () => {
    render(<PdfWatermarkTool file={pdfFile()} onApply={vi.fn()} />)

    expect(screen.getByText("Génération de l'aperçu…")).toBeInTheDocument()

    await waitFor(() => expect(screen.getByAltText('Aperçu (1ère page)')).toBeInTheDocument())
    await waitFor(() => expect(watermarkImage).toHaveBeenCalled(), { timeout: 1000 })
    await waitFor(
      () => expect(screen.getByAltText('Aperçu (1ère page)').getAttribute('src')).toMatch(/^blob:/),
      { timeout: 1000 },
    )
  })

  it('calls onApply with the whole-document watermarked PDF blob on apply', async () => {
    const onApply = vi.fn()
    const user = userEvent.setup()
    render(<PdfWatermarkTool file={pdfFile()} onApply={onApply} />)

    await user.click(screen.getByText('Appliquer le filigrane'))

    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1))
    expect(onApply.mock.calls[0][0].type).toBe('application/pdf')
  })
})
