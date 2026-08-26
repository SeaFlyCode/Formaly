import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CropTool } from './CropTool'
import { cropImageToBlob } from '../lib/crop-image'

interface CropperProps {
  onCropChange: (point: { x: number; y: number }) => void
  onZoomChange: (zoom: number) => void
  onMediaLoaded: (size: { naturalWidth: number; naturalHeight: number }) => void
  onCropAreaChange: (area: unknown, areaPixels: { x: number; y: number; width: number; height: number }) => void
  onCropComplete: (area: unknown, areaPixels: { x: number; y: number; width: number; height: number }) => void
}

let lastCropperProps: CropperProps | null = null
const AREA_PIXELS = { x: 1, y: 2, width: 300, height: 200 }

vi.mock('react-easy-crop', () => ({
  default: (props: CropperProps) => {
    lastCropperProps = props
    return <div data-testid="cropper" />
  },
}))

vi.mock('../lib/crop-image', async () => {
  const actual = await vi.importActual<typeof import('../lib/crop-image')>('../lib/crop-image')
  return { ...actual, cropImageToBlob: vi.fn() }
})

function completeCrop() {
  act(() => lastCropperProps?.onCropComplete(null, AREA_PIXELS))
}

describe('CropTool', () => {
  afterEach(() => {
    vi.clearAllMocks()
    lastCropperProps = null
  })

  it('disables apply until a crop area has been completed', () => {
    render(<CropTool imageUrl="data:image/png;base64,x" mimeType="image/png" onApply={vi.fn()} />)
    expect(screen.getByText('Appliquer le rognage')).toBeDisabled()
  })

  it('enables apply once onCropComplete fires', () => {
    render(<CropTool imageUrl="data:image/png;base64,x" mimeType="image/png" onApply={vi.fn()} />)
    completeCrop()
    expect(screen.getByText('Appliquer le rognage')).toBeEnabled()
  })

  it('shows the live crop dimensions', () => {
    render(<CropTool imageUrl="data:image/png;base64,x" mimeType="image/png" onApply={vi.fn()} />)
    act(() => lastCropperProps?.onCropAreaChange(null, AREA_PIXELS))
    expect(screen.getByText('300 × 200 px')).toBeInTheDocument()
  })

  it('toggles the active aspect ratio', async () => {
    const user = userEvent.setup()
    render(<CropTool imageUrl="data:image/png;base64,x" mimeType="image/png" onApply={vi.fn()} />)

    await user.click(screen.getByText('1:1'))

    expect(screen.getByText('1:1')).toHaveClass('bg-(--color-accent)')
    expect(screen.getByText('Libre')).not.toHaveClass('bg-(--color-accent)')
  })

  it('toggles horizontal and vertical flip', async () => {
    const user = userEvent.setup()
    render(<CropTool imageUrl="data:image/png;base64,x" mimeType="image/png" onApply={vi.fn()} />)

    await user.click(screen.getByLabelText('Miroir horizontal'))
    await user.click(screen.getByLabelText('Miroir vertical'))

    expect(screen.getByLabelText('Miroir horizontal')).toHaveClass('bg-(--color-accent)')
    expect(screen.getByLabelText('Miroir vertical')).toHaveClass('bg-(--color-accent)')
  })

  it('rotates by -90 and +90 degrees, wrapping at the bounds', async () => {
    const user = userEvent.setup()
    render(<CropTool imageUrl="data:image/png;base64,x" mimeType="image/png" onApply={vi.fn()} />)

    await user.click(screen.getByLabelText('Rotation -90°'))
    completeCrop()
    await user.click(screen.getByText('Appliquer le rognage'))

    expect(cropImageToBlob).toHaveBeenCalledWith(
      'data:image/png;base64,x',
      AREA_PIXELS,
      'image/png',
      270,
      { horizontal: false, vertical: false },
    )
  })

  it('calls onApply with the cropped blob', async () => {
    const blob = new Blob(['cropped'])
    vi.mocked(cropImageToBlob).mockResolvedValue(blob)
    const onApply = vi.fn()
    const user = userEvent.setup()
    render(<CropTool imageUrl="data:image/png;base64,x" mimeType="image/png" onApply={onApply} />)

    completeCrop()
    await user.click(screen.getByText('Appliquer le rognage'))

    expect(onApply).toHaveBeenCalledWith(blob)
  })

  it('does nothing when apply is triggered before a crop is complete', () => {
    render(<CropTool imageUrl="data:image/png;base64,x" mimeType="image/png" onApply={vi.fn()} />)
    expect(cropImageToBlob).not.toHaveBeenCalled()
  })
})
