import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ModeSelector } from './ModeSelector'

describe('ModeSelector', () => {
  it('renders all four modes', () => {
    render(<ModeSelector value="convert" onChange={vi.fn()} />)
    expect(screen.getByText('Convertir')).toBeInTheDocument()
    expect(screen.getByText('Rogner')).toBeInTheDocument()
    expect(screen.getByText('Supprimer le fond')).toBeInTheDocument()
    expect(screen.getByText('Compresser / Redimensionner')).toBeInTheDocument()
  })

  it('marks the active mode button distinctly', () => {
    render(<ModeSelector value="crop" onChange={vi.fn()} />)
    expect(screen.getByText('Rogner')).toHaveClass('bg-(--color-accent)')
    expect(screen.getByText('Convertir')).not.toHaveClass('bg-(--color-accent)')
  })

  it('calls onChange with the clicked mode', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ModeSelector value="convert" onChange={onChange} />)

    await user.click(screen.getByText('Supprimer le fond'))

    expect(onChange).toHaveBeenCalledExactlyOnceWith('remove-bg')
  })
})
