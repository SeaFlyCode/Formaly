import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ToolSelector } from './ToolSelector'

describe('ToolSelector', () => {
  it('shows PNG/JPEG/WebP/PDF for an image source', () => {
    render(<ToolSelector value="png" onChange={vi.fn()} sourceType="jpeg" />)
    expect(screen.getByText('PNG')).toBeInTheDocument()
    expect(screen.getByText('JPEG')).toBeInTheDocument()
    expect(screen.getByText('WebP')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
  })

  it('excludes PDF as a target when the source is a PDF', () => {
    render(<ToolSelector value="png" onChange={vi.fn()} sourceType="pdf" />)
    expect(screen.queryByText('PDF')).not.toBeInTheDocument()
  })

  it('disables the option matching the source type', () => {
    render(<ToolSelector value="webp" onChange={vi.fn()} sourceType="jpeg" />)
    expect(screen.getByText('JPEG').closest('button')).toBeDisabled()
    expect(screen.getByText('PNG').closest('button')).toBeEnabled()
  })

  it('calls onChange when an enabled option is clicked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ToolSelector value="png" onChange={onChange} sourceType="jpeg" />)

    await user.click(screen.getByText('WebP'))

    expect(onChange).toHaveBeenCalledExactlyOnceWith('webp')
  })

  it('does not call onChange when the disabled option is clicked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ToolSelector value="png" onChange={onChange} sourceType="jpeg" />)

    await user.click(screen.getByText('JPEG'))

    expect(onChange).not.toHaveBeenCalled()
  })
})
