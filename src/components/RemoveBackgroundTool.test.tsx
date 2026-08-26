import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RemoveBackgroundTool } from './RemoveBackgroundTool'
import { removeBackground } from '../lib/remove-background'

vi.mock('../lib/remove-background', () => ({ removeBackground: vi.fn() }))

const file = new File(['x'], 'photo.png', { type: 'image/png' })

describe('RemoveBackgroundTool', () => {
  beforeEach(() => {
    vi.mocked(removeBackground).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the idle prompt initially', () => {
    render(<RemoveBackgroundTool imageUrl="data:image/png;base64,x" file={file} onApply={vi.fn()} />)
    expect(
      screen.getByText('Détecte le sujet et rend le fond transparent, directement dans votre navigateur.'),
    ).toBeInTheDocument()
  })

  it('calls onApply with the resulting blob on success', async () => {
    const blob = new Blob(['result'])
    vi.mocked(removeBackground).mockResolvedValue(blob)
    const onApply = vi.fn()
    const user = userEvent.setup()
    render(<RemoveBackgroundTool imageUrl="data:image/png;base64,x" file={file} onApply={onApply} />)

    await user.click(screen.getByText('Supprimer le fond'))

    await waitFor(() => expect(onApply).toHaveBeenCalledWith(blob))
  })

  it('shows download progress while running', async () => {
    let resolveProgress: (() => void) | undefined
    vi.mocked(removeBackground).mockImplementation(
      (_file, onProgress) =>
        new Promise((resolve) => {
          onProgress?.({ status: 'downloading', progress: 42 })
          resolveProgress = () => resolve(new Blob())
        }),
    )
    const user = userEvent.setup()
    render(<RemoveBackgroundTool imageUrl="data:image/png;base64,x" file={file} onApply={vi.fn()} />)

    await user.click(screen.getByText('Supprimer le fond'))

    expect(await screen.findByText('Téléchargement du modèle IA… 42%')).toBeInTheDocument()
    resolveProgress?.()
  })

  it('disables the button while running', async () => {
    vi.mocked(removeBackground).mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    render(<RemoveBackgroundTool imageUrl="data:image/png;base64,x" file={file} onApply={vi.fn()} />)

    await user.click(screen.getByText('Supprimer le fond'))

    expect(await screen.findByRole('button')).toBeDisabled()
  })

  it('shows an error message when removal fails', async () => {
    vi.mocked(removeBackground).mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    render(<RemoveBackgroundTool imageUrl="data:image/png;base64,x" file={file} onApply={vi.fn()} />)

    await user.click(screen.getByText('Supprimer le fond'))

    expect(
      await screen.findByText('Échec de la suppression du fond — réessayez ou utilisez une autre image.'),
    ).toBeInTheDocument()
  })
})
