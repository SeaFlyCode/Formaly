import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PDFDocument } from 'pdf-lib'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MergeTool } from './MergeTool'

async function makePdfFile(name: string, pageCount = 1): Promise<File> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) doc.addPage([50, 50])
  const bytes = await doc.save()
  return new File([bytes.slice()], name, { type: 'application/pdf' })
}

function getInput(): HTMLInputElement {
  return document.querySelector('input[type="file"]') as HTMLInputElement
}

describe('MergeTool', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('shows an error when a non-PDF file is added', () => {
    render(<MergeTool />)

    const notPdf = new File(['x'], 'photo.png', { type: 'image/png' })
    fireEvent.change(getInput(), { target: { files: [notPdf] } })

    expect(screen.getByText('Seuls les fichiers PDF sont acceptés pour la fusion.')).toBeInTheDocument()
  })

  it('lists added PDF files and disables merge with fewer than two', async () => {
    const user = userEvent.setup()
    render(<MergeTool />)

    await user.upload(getInput(), await makePdfFile('a.pdf'))

    expect(screen.getByText('a.pdf')).toBeInTheDocument()
    expect(screen.getByText('Fusionner 1 PDF')).toBeDisabled()
  })

  it('enables merge once at least two files are added and merges them', async () => {
    const user = userEvent.setup()
    render(<MergeTool />)

    await user.upload(getInput(), [await makePdfFile('a.pdf', 2), await makePdfFile('b.pdf', 3)])

    const mergeButton = screen.getByText('Fusionner 2 PDF')
    expect(mergeButton).toBeEnabled()

    await user.click(mergeButton)

    expect(await screen.findByText('fusion.pdf')).toBeInTheDocument()
  })

  it('removes an item from the list', async () => {
    const user = userEvent.setup()
    render(<MergeTool />)

    await user.upload(getInput(), [await makePdfFile('a.pdf'), await makePdfFile('b.pdf')])
    await user.click(screen.getAllByLabelText('Retirer')[0])

    expect(screen.queryByText('a.pdf')).not.toBeInTheDocument()
    expect(screen.getByText('b.pdf')).toBeInTheDocument()
  })

  it('reorders items with the up/down controls', async () => {
    const user = userEvent.setup()
    render(<MergeTool />)

    await user.upload(getInput(), [await makePdfFile('a.pdf'), await makePdfFile('b.pdf')])

    const [, downButtons] = [screen.getAllByLabelText('Monter'), screen.getAllByLabelText('Descendre')]
    await user.click(downButtons[0])

    const names = screen.getAllByText(/\.pdf$/).map((el) => el.textContent)
    expect(names).toEqual(['b.pdf', 'a.pdf'])
  })

  it('disables the first item’s up control and the last item’s down control', async () => {
    const user = userEvent.setup()
    render(<MergeTool />)

    await user.upload(getInput(), [await makePdfFile('a.pdf'), await makePdfFile('b.pdf')])

    expect(screen.getAllByLabelText('Monter')[0]).toBeDisabled()
    expect(screen.getAllByLabelText('Descendre')[1]).toBeDisabled()
  })
})
