import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PreviewPanel } from './PreviewPanel'

const baseProps = {
  originalUrl: 'blob:original',
  originalIsImage: true,
  originalLabel: 'Original',
  originalFormatLabel: 'PNG',
  originalSize: 2048,
  resultUrl: null as string | null,
  resultIsImage: true,
  resultLabel: 'Résultat',
  resultFormatLabel: 'JPEG',
  resultSize: null as number | null,
  isProcessing: false,
  children: <span>arrow</span>,
}

describe('PreviewPanel', () => {
  it('renders the original image and its size badge', () => {
    render(<PreviewPanel {...baseProps} />)
    expect(screen.getByAltText('Original')).toHaveAttribute('src', 'blob:original')
    expect(screen.getByText('PNG · 2 Ko')).toBeInTheDocument()
  })

  it('shows a waiting message when there is no result yet and not processing', () => {
    render(<PreviewPanel {...baseProps} />)
    expect(screen.getByText('En attente')).toBeInTheDocument()
  })

  it('shows a processing message when converting', () => {
    render(<PreviewPanel {...baseProps} isProcessing />)
    expect(screen.getByText('Conversion…')).toBeInTheDocument()
  })

  it('renders the result image with its badge once available', () => {
    render(<PreviewPanel {...baseProps} resultUrl="blob:result" resultSize={500} />)
    expect(screen.getByAltText('Résultat')).toHaveAttribute('src', 'blob:result')
    expect(screen.getByText('JPEG · 500 o')).toBeInTheDocument()
  })

  it('shows a generic file icon instead of an <img> for non-image results', () => {
    render(
      <PreviewPanel
        {...baseProps}
        resultUrl="blob:result.pdf"
        resultIsImage={false}
        resultSize={3 * 1024 * 1024}
      />,
    )
    expect(screen.queryByAltText('Résultat')).not.toBeInTheDocument()
    expect(screen.getByText('JPEG · 3.0 Mo')).toBeInTheDocument()
  })

  it('renders the children between the two slots', () => {
    render(<PreviewPanel {...baseProps} />)
    expect(screen.getByText('arrow')).toBeInTheDocument()
  })
})
