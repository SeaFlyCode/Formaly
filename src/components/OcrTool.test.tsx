import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OcrTool } from './OcrTool'
import { extractText } from '../lib/ocr'

vi.mock('../lib/ocr', () => ({ extractText: vi.fn() }))

describe('OcrTool', () => {
  beforeEach(() => {
    vi.mocked(extractText).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the idle prompt initially', () => {
    render(<OcrTool imageUrl="data:image/png;base64,x" onApply={vi.fn()} />)
    expect(
      screen.getByText("Extrait le texte visible dans l'image, directement dans votre navigateur."),
    ).toBeInTheDocument()
  })

  it('does not show a text area before extraction', () => {
    render(<OcrTool imageUrl="data:image/png;base64,x" onApply={vi.fn()} />)
    expect(screen.queryByText('Texte extrait')).not.toBeInTheDocument()
  })

  it('calls onApply with a text/plain blob on success', async () => {
    vi.mocked(extractText).mockResolvedValue('hello world')
    const onApply = vi.fn()
    const user = userEvent.setup()
    render(<OcrTool imageUrl="data:image/png;base64,x" onApply={onApply} />)

    await user.click(screen.getByText('Extraire le texte'))

    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1))
    const blob = onApply.mock.calls[0][0] as Blob
    expect(blob.type).toBe('text/plain')
  })

  it('displays the extracted text', async () => {
    vi.mocked(extractText).mockResolvedValue('hello world')
    const user = userEvent.setup()
    render(<OcrTool imageUrl="data:image/png;base64,x" onApply={vi.fn()} />)

    await user.click(screen.getByText('Extraire le texte'))

    expect(await screen.findByDisplayValue('hello world')).toBeInTheDocument()
  })

  it('shows progress while running', async () => {
    let resolveExtraction: (() => void) | undefined
    vi.mocked(extractText).mockImplementation(
      (_url, onProgress) =>
        new Promise((resolve) => {
          onProgress?.(57)
          resolveExtraction = () => resolve('done')
        }),
    )
    const user = userEvent.setup()
    render(<OcrTool imageUrl="data:image/png;base64,x" onApply={vi.fn()} />)

    await user.click(screen.getByText('Extraire le texte'))

    expect(await screen.findByText('Reconnaissance du texte en cours… 57%')).toBeInTheDocument()
    resolveExtraction?.()
  })

  it('disables the button while running', async () => {
    vi.mocked(extractText).mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    render(<OcrTool imageUrl="data:image/png;base64,x" onApply={vi.fn()} />)

    await user.click(screen.getByText('Extraire le texte'))

    expect(await screen.findByRole('button', { name: 'Traitement…' })).toBeDisabled()
  })

  it('shows an error message when extraction fails', async () => {
    vi.mocked(extractText).mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    render(<OcrTool imageUrl="data:image/png;base64,x" onApply={vi.fn()} />)

    await user.click(screen.getByText('Extraire le texte'))

    expect(
      await screen.findByText("Échec de l'extraction du texte — réessayez ou utilisez une autre image."),
    ).toBeInTheDocument()
  })

  it('copies the extracted text to the clipboard', async () => {
    vi.mocked(extractText).mockResolvedValue('hello world')
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
    render(<OcrTool imageUrl="data:image/png;base64,x" onApply={vi.fn()} />)
    await user.click(screen.getByText('Extraire le texte'))
    await screen.findByDisplayValue('hello world')

    await user.click(screen.getByText('Copier'))

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello world')
    expect(await screen.findByText('Copié !')).toBeInTheDocument()
  })
})
