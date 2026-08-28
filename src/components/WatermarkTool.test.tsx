import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WatermarkTool } from './WatermarkTool'
import { watermarkImage } from '../lib/watermark'

vi.mock('../lib/watermark', () => ({
  watermarkImage: vi.fn(),
}))

describe('WatermarkTool', () => {
  beforeEach(() => {
    vi.mocked(watermarkImage).mockResolvedValue(new Blob(['x'], { type: 'image/png' }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows the original image before the debounced watermark preview resolves', () => {
    render(<WatermarkTool imageUrl="blob:original" onApply={vi.fn()} />)

    expect(screen.getByAltText('Aperçu')).toHaveAttribute('src', 'blob:original')
  })

  it('swaps the preview to the watermarked blob after the debounce resolves', async () => {
    render(<WatermarkTool imageUrl="blob:original" onApply={vi.fn()} />)

    await waitFor(() => expect(watermarkImage).toHaveBeenCalled(), { timeout: 1000 })
    await waitFor(
      () => expect(screen.getByAltText('Aperçu').getAttribute('src')).toMatch(/^blob:/),
      { timeout: 1000 },
    )
  })

  it('re-runs the preview when the opacity slider changes', async () => {
    render(<WatermarkTool imageUrl="blob:original" onApply={vi.fn()} />)
    await waitFor(() => expect(watermarkImage).toHaveBeenCalledTimes(1), { timeout: 1000 })

    fireEvent.change(screen.getByRole('slider'), { target: { value: '80' } })

    await waitFor(() => expect(watermarkImage).toHaveBeenCalledTimes(2), { timeout: 1000 })
    expect(vi.mocked(watermarkImage).mock.calls[1][1]).toMatchObject({ opacity: 0.8 })
  })

  it('calls onApply with the watermarked blob on apply', async () => {
    const onApply = vi.fn()
    const user = userEvent.setup()
    render(<WatermarkTool imageUrl="blob:original" onApply={onApply} />)

    await user.click(screen.getByText('Appliquer le filigrane'))

    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1))
  })
})
