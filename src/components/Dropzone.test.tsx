import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Dropzone } from './Dropzone'

function makeFile(name = 'photo.png', type = 'image/png'): File {
  return new File(['x'], name, { type })
}

describe('Dropzone', () => {
  it('renders the default prompt and format pills', () => {
    render(<Dropzone onFileSelected={vi.fn()} accept="image/*" />)
    expect(screen.getByText('Glissez un fichier ici')).toBeInTheDocument()
    expect(screen.getByText('PNG')).toBeInTheDocument()
    expect(screen.getByText('HEIC')).toBeInTheDocument()
  })

  it('calls onFileSelected when a file is chosen via the input', async () => {
    const onFileSelected = vi.fn()
    const user = userEvent.setup()
    render(<Dropzone onFileSelected={onFileSelected} accept="image/*" />)

    const file = makeFile()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)

    expect(onFileSelected).toHaveBeenCalledExactlyOnceWith(file)
  })

  it('shows the drop prompt while dragging over', () => {
    render(<Dropzone onFileSelected={vi.fn()} accept="image/*" />)
    const zone = screen.getByRole('button')

    fireEvent.dragOver(zone)

    expect(screen.getByText('Lâchez le fichier')).toBeInTheDocument()
  })

  it('resets the drop prompt on drag leave', () => {
    render(<Dropzone onFileSelected={vi.fn()} accept="image/*" />)
    const zone = screen.getByRole('button')

    fireEvent.dragOver(zone)
    fireEvent.dragLeave(zone)

    expect(screen.getByText('Glissez un fichier ici')).toBeInTheDocument()
  })

  it('calls onFileSelected with the dropped file', () => {
    const onFileSelected = vi.fn()
    render(<Dropzone onFileSelected={onFileSelected} accept="image/*" />)
    const zone = screen.getByRole('button')

    const file = makeFile()
    fireEvent.drop(zone, { dataTransfer: { files: [file] } })

    expect(onFileSelected).toHaveBeenCalledExactlyOnceWith(file)
  })

  it('does not call onFileSelected when the drop has no file', () => {
    const onFileSelected = vi.fn()
    render(<Dropzone onFileSelected={onFileSelected} accept="image/*" />)
    const zone = screen.getByRole('button')

    fireEvent.drop(zone, { dataTransfer: { files: [] } })

    expect(onFileSelected).not.toHaveBeenCalled()
  })
})
