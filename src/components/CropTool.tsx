import { useState } from 'react'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import { cropImageToBlob, type FlipState } from '../lib/crop-image'

interface CropToolProps {
  imageUrl: string
  mimeType: string
  onApply: (blob: Blob) => void
}

const RATIOS: { label: string; value: number | undefined }[] = [
  { label: 'Libre', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
  { label: '3:2', value: 3 / 2 },
]

export function CropTool({ imageUrl, mimeType, onApply }: CropToolProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [flip, setFlip] = useState<FlipState>({ horizontal: false, vertical: false })
  const [aspectChoice, setAspectChoice] = useState<number | undefined>(undefined)
  const [naturalAspect, setNaturalAspect] = useState(4 / 3)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [liveArea, setLiveArea] = useState<Area | null>(null)
  const [isApplying, setIsApplying] = useState(false)

  const aspect = aspectChoice ?? naturalAspect

  const transform = `translate(${crop.x}px, ${crop.y}px) rotate(${rotation}deg) scale(${zoom}) scaleX(${
    flip.horizontal ? -1 : 1
  }) scaleY(${flip.vertical ? -1 : 1})`

  async function handleApply() {
    if (!croppedAreaPixels) return
    setIsApplying(true)
    const blob = await cropImageToBlob(imageUrl, croppedAreaPixels, mimeType, rotation, flip)
    setIsApplying(false)
    onApply(blob)
  }

  const displayArea = liveArea ?? croppedAreaPixels

  return (
    <div className="flex flex-1 flex-col gap-5 rounded-2xl border border-(--color-line) bg-(--color-card) p-6">
      <div className="flex flex-wrap items-center gap-2">
        {RATIOS.map(({ label, value }) => {
          const isActive = value === aspectChoice
          return (
            <button
              key={label}
              type="button"
              onClick={() => setAspectChoice(value)}
              className={`rounded-full px-4 py-2 text-[13px] transition-colors ${
                isActive
                  ? 'bg-(--color-accent) font-medium text-(--color-card)'
                  : 'border border-(--color-line) text-(--color-ink-soft) hover:border-(--color-accent)/50'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="relative h-[380px] w-full overflow-hidden rounded-xl bg-(--color-paper) sm:h-[440px]">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          transform={transform}
          showGrid
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onMediaLoaded={(mediaSize) => setNaturalAspect(mediaSize.naturalWidth / mediaSize.naturalHeight)}
          onCropAreaChange={(_area, areaPixels) => setLiveArea(areaPixels)}
          onCropComplete={(_area, areaPixels) => setCroppedAreaPixels(areaPixels)}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <IconButton label="Rotation -90°" onClick={() => setRotation((r) => (r - 90 + 360) % 360)}>
            <path d="M7 4a8 8 0 1 0 6.4 3.2M7 4v4M7 4h4" />
          </IconButton>
          <IconButton label="Rotation +90°" onClick={() => setRotation((r) => (r + 90) % 360)}>
            <path d="M17 4a8 8 0 1 1-6.4 3.2M17 4v4M17 4h-4" />
          </IconButton>
          <div className="mx-1 h-6 w-px bg-(--color-line)" />
          <IconButton
            label="Miroir horizontal"
            active={flip.horizontal}
            onClick={() => setFlip((f) => ({ ...f, horizontal: !f.horizontal }))}
          >
            <path d="M12 3v18M6 7l-2 5 2 5M18 7l2 5-2 5" />
          </IconButton>
          <IconButton
            label="Miroir vertical"
            active={flip.vertical}
            onClick={() => setFlip((f) => ({ ...f, vertical: !f.vertical }))}
          >
            <path d="M3 12h18M7 6l5-2 5 2M7 18l5 2 5-2" />
          </IconButton>

          {displayArea && (
            <span className="ml-auto font-mono text-[12px] tracking-wide text-(--color-ink-faint)">
              {Math.round(displayArea.width)} × {Math.round(displayArea.height)} px
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex flex-1 items-center gap-3 text-[13px] text-(--color-ink-soft)">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-(--color-accent)"
            />
          </label>
          <button
            type="button"
            disabled={!croppedAreaPixels || isApplying}
            onClick={handleApply}
            className="rounded-[10px] bg-(--color-ink) px-[22px] py-[11px] text-sm font-medium text-(--color-card) transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isApplying ? 'Rognage en cours…' : 'Appliquer le rognage'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface IconButtonProps {
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}

function IconButton({ label, active, onClick, children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] transition-colors ${
        active
          ? 'bg-(--color-accent) text-(--color-card)'
          : 'border border-(--color-line) text-(--color-ink-soft) hover:border-(--color-accent)/50'
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  )
}
