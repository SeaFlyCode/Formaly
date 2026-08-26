import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PDFDocument } from 'pdf-lib'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SplitTool } from './SplitTool'

vi.mock('../lib/pdf-to-images', () => ({
  renderPdfThumbnails: vi.fn(() =>
    Promise.resolve([new Blob(['1']), new Blob(['2']), new Blob(['3'])]),
  ),
}))

async function makePdfFile(pageCount: number): Promise<File> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) doc.addPage([50, 50])
  const bytes = await doc.save()
  return new File([bytes.slice()], 'doc.pdf', { type: 'application/pdf' })
}

describe('SplitTool', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows a loading state before thumbnails resolve', async () => {
    const file = await makePdfFile(3)
    render(<SplitTool file={file} pageCount={3} onApply={vi.fn()} />)

    expect(screen.getByText('Génération des miniatures…')).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(3))
  })

  it('toggles page selection and updates the counter', async () => {
    const file = await makePdfFile(3)
    const user = userEvent.setup()
    render(<SplitTool file={file} pageCount={3} onApply={vi.fn()} />)

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(3))
    await user.click(screen.getByAltText('Page 1'))

    expect(screen.getByText('1 page sélectionnée sur 3')).toBeInTheDocument()
  })

  it('selects and deselects all pages', async () => {
    const file = await makePdfFile(3)
    const user = userEvent.setup()
    render(<SplitTool file={file} pageCount={3} onApply={vi.fn()} />)

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(3))
    await user.click(screen.getByText('Tout sélectionner'))
    expect(screen.getByText('3 pages sélectionnées sur 3')).toBeInTheDocument()

    await user.click(screen.getByText('Tout désélectionner'))
    expect(screen.getByText('0 page sélectionnée sur 3')).toBeInTheDocument()
  })

  it('disables the split button until a page is selected', async () => {
    const file = await makePdfFile(3)
    render(<SplitTool file={file} pageCount={3} onApply={vi.fn()} />)

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(3))
    expect(screen.getByText('Découper le PDF')).toBeDisabled()
  })

  it('calls onApply with the resulting blob after splitting', async () => {
    const file = await makePdfFile(3)
    const onApply = vi.fn()
    const user = userEvent.setup()
    render(<SplitTool file={file} pageCount={3} onApply={onApply} />)

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(3))
    await user.click(screen.getByAltText('Page 1'))
    await user.click(screen.getByText('Découper le PDF'))

    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1))
    expect(onApply.mock.calls[0][0]).toBeInstanceOf(Blob)
  })
})
