import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExportButton } from './ExportButton'

describe('ExportButton', () => {
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
  })

  it('shows the file name', () => {
    render(<ExportButton blob={null} fileName="photo.png" isProcessing={false} />)
    expect(screen.getByText('photo.png')).toBeInTheDocument()
  })

  it('is disabled when there is no blob', () => {
    render(<ExportButton blob={null} fileName="photo.png" isProcessing={false} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled while processing even with a blob', () => {
    const blob = new Blob(['x'])
    render(<ExportButton blob={blob} fileName="photo.png" isProcessing={true} />)
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByText('Conversion en cours…')).toBeInTheDocument()
  })

  it('is enabled once a blob is ready and not processing', () => {
    const blob = new Blob(['x'])
    render(<ExportButton blob={blob} fileName="photo.png" isProcessing={false} />)
    expect(screen.getByRole('button')).toBeEnabled()
    expect(screen.getByText('Télécharger')).toBeInTheDocument()
  })

  it('creates and revokes an object URL when clicked', async () => {
    const blob = new Blob(['x'])
    const user = userEvent.setup()
    render(<ExportButton blob={blob} fileName="photo.png" isProcessing={false} />)

    await user.click(screen.getByRole('button'))

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })
})
