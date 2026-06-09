import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { HEIGHT, WIDTH } from '../utils/planoUtils'

type PlanoBackgroundFrame = {
  displayHeight: number
  displayWidth: number
  imageDisplayHeight: number
  imageDisplayWidth: number
  imageX: number
  imageY: number
  x: number
  y: number
}

type PendingBackgroundImage = {
  file: File
  frame: PlanoBackgroundFrame
  height: number
  src: string
  width: number
}

type FrameHandle = 'move' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'

type FrameInteraction = {
  handle: FrameHandle
  startClientX: number
  startClientY: number
  startFrame: PlanoBackgroundFrame
}

type PlanoToolbarProps = {
  backgroundImageName?: string
  onClearBackground: () => void
  onClearPlan: () => void
  onSavePlan: () => void
  onUploadBackground: (file: File, frame: PlanoBackgroundFrame) => Promise<void>
}

export function PlanoToolbar({
  backgroundImageName,
  onClearBackground,
  onClearPlan,
  onSavePlan,
  onUploadBackground,
}: PlanoToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingImage, setPendingImage] = useState<PendingBackgroundImage | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file?.type.startsWith('image/')) return

    setIsUploading(true)
    try {
      const src = await readFileAsDataUrl(file)
      const size = await readImageSize(src)
      const frame = getDefaultFrame(size.width, size.height)
      setPendingImage({
        file,
        frame,
        height: size.height,
        src,
        width: size.width,
      })
    } finally {
      setIsUploading(false)
    }
  }

  async function confirmBackgroundImage() {
    if (!pendingImage) return

    setIsUploading(true)
    try {
      await onUploadBackground(pendingImage.file, pendingImage.frame)
      setPendingImage(null)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200/80">
        <input
          ref={inputRef}
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          type="file"
        />

        <button
          onClick={onSavePlan}
          className="min-h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          type="button"
        >
          Guardar plano
        </button>

        <button
          onClick={onClearPlan}
          className="min-h-10 rounded-xl bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          type="button"
        >
          Limpiar plano
        </button>

        <button
          className="min-h-10 rounded-xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-70"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {isUploading ? 'Cargando imagen...' : backgroundImageName ? 'Cambiar imagen' : 'Subir imagen'}
        </button>

        {backgroundImageName && (
          <>
            <span className="max-w-[260px] truncate rounded-xl bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-600">
              {backgroundImageName}
            </span>

            <button
              className="min-h-10 rounded-xl bg-zinc-100 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200"
              onClick={onClearBackground}
              type="button"
            >
              Quitar imagen
            </button>
          </>
        )}
      </div>

      {pendingImage && (
        <BackgroundImageFrameDialog
          image={pendingImage}
          isSaving={isUploading}
          onCancel={() => setPendingImage(null)}
          onConfirm={confirmBackgroundImage}
          onFrameChange={(frame) => setPendingImage((current) => (current ? { ...current, frame } : current))}
        />
      )}
    </>
  )
}

function BackgroundImageFrameDialog({
  image,
  isSaving,
  onCancel,
  onConfirm,
  onFrameChange,
}: {
  image: PendingBackgroundImage
  isSaving: boolean
  onCancel: () => void
  onConfirm: () => void
  onFrameChange: (frame: PlanoBackgroundFrame) => void
}) {
  const previewWidth = 720
  const previewScale = previewWidth / WIDTH
  const previewHeight = Math.round(HEIGHT * previewScale)
  const [frameInteraction, setFrameInteraction] = useState<FrameInteraction | null>(null)

  useEffect(() => {
    if (!frameInteraction) return
    const interaction = frameInteraction

    function handlePointerMove(event: PointerEvent) {
      event.preventDefault()
      const deltaX = (event.clientX - interaction.startClientX) / previewScale
      const deltaY = (event.clientY - interaction.startClientY) / previewScale
      onFrameChange(
        interaction.handle === 'move'
          ? moveFrame(interaction.startFrame, deltaX, deltaY)
          : resizeFrameFromHandle(interaction.startFrame, interaction.handle, deltaX, deltaY),
      )
    }

    function handlePointerUp() {
      setFrameInteraction(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [frameInteraction, image.height, image.width, onFrameChange, previewScale])

  const previewImageFrame = {
    height: image.frame.imageDisplayHeight * previewScale,
    left: image.frame.imageX * previewScale,
    top: image.frame.imageY * previewScale,
    width: image.frame.imageDisplayWidth * previewScale,
  }
  const previewFrame = {
    height: image.frame.displayHeight * previewScale,
    left: image.frame.x * previewScale,
    top: image.frame.y * previewScale,
    width: image.frame.displayWidth * previewScale,
  }

  function startFrameInteraction(handle: FrameHandle, event: ReactPointerEvent<HTMLElement>) {
    event.preventDefault()
    event.stopPropagation()
    setFrameInteraction({
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startFrame: image.frame,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[820px] rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-zinc-950">Ajustar imagen del plano</h2>
            <p className="mt-1 text-sm text-zinc-600">{image.file.name}</p>
          </div>

          <button
            className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200"
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div
            className="relative mx-auto overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-inner"
            style={{
              backgroundImage:
                'linear-gradient(to right, #d4d4d8 1px, transparent 1px), linear-gradient(to bottom, #d4d4d8 1px, transparent 1px)',
              backgroundSize: `${30 * previewScale}px ${30 * previewScale}px`,
              height: previewHeight,
              width: previewWidth,
            }}
          >
            <img
              alt=""
              className="pointer-events-none absolute select-none"
              draggable={false}
              src={image.src}
              style={previewImageFrame}
            />

            <div
              className="absolute cursor-move border-2 border-emerald-600 bg-emerald-500/10 shadow-[0_0_0_999px_rgba(15,23,42,0.20)]"
              onPointerDown={(event) => startFrameInteraction('move', event)}
              style={previewFrame}
            >
              <FrameHandleDot className="left-1/2 top-1 -translate-x-1/2 cursor-ns-resize" onPointerDown={(event) => startFrameInteraction('n', event)} />
              <FrameHandleDot className="right-1 top-1 cursor-nesw-resize" onPointerDown={(event) => startFrameInteraction('ne', event)} />
              <FrameHandleDot className="right-1 top-1/2 -translate-y-1/2 cursor-ew-resize" onPointerDown={(event) => startFrameInteraction('e', event)} />
              <FrameHandleDot className="bottom-1 right-1 cursor-nwse-resize" onPointerDown={(event) => startFrameInteraction('se', event)} />
              <FrameHandleDot className="bottom-1 left-1/2 -translate-x-1/2 cursor-ns-resize" onPointerDown={(event) => startFrameInteraction('s', event)} />
              <FrameHandleDot className="bottom-1 left-1 cursor-nesw-resize" onPointerDown={(event) => startFrameInteraction('sw', event)} />
              <FrameHandleDot className="left-1 top-1/2 -translate-y-1/2 cursor-ew-resize" onPointerDown={(event) => startFrameInteraction('w', event)} />
              <FrameHandleDot className="left-1 top-1 cursor-nwse-resize" onPointerDown={(event) => startFrameInteraction('nw', event)} />
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-[720px] flex-wrap justify-end gap-3">
            <button
              className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200"
              onClick={() => onFrameChange(getDefaultFrame(image.width, image.height))}
              type="button"
            >
              Centrar y ajustar
            </button>

            <button
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:bg-blue-300"
              disabled={isSaving}
              onClick={onConfirm}
              type="button"
            >
              {isSaving ? 'Colocando...' : 'Colocar en plano'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FrameHandleDot({
  className,
  onPointerDown,
}: {
  className: string
  onPointerDown: (event: ReactPointerEvent<HTMLSpanElement>) => void
}) {
  return (
    <span
      className={`absolute h-4 w-4 rounded-full border-2 border-white bg-emerald-600 shadow ${className}`}
      onPointerDown={onPointerDown}
    />
  )
}

function moveFrame(frame: PlanoBackgroundFrame, deltaX: number, deltaY: number) {
  const maxX = frame.imageX + frame.imageDisplayWidth - frame.displayWidth
  const maxY = frame.imageY + frame.imageDisplayHeight - frame.displayHeight

  return normalizeFrame({
    ...frame,
    x: Math.min(Math.max(frame.x + deltaX, frame.imageX), maxX),
    y: Math.min(Math.max(frame.y + deltaY, frame.imageY), maxY),
  })
}

function resizeFrameFromHandle(
  frame: PlanoBackgroundFrame,
  handle: Exclude<FrameHandle, 'move'>,
  deltaX: number,
  deltaY: number,
) {
  const minSize = 24
  const right = frame.x + frame.displayWidth
  const bottom = frame.y + frame.displayHeight
  const imageRight = frame.imageX + frame.imageDisplayWidth
  const imageBottom = frame.imageY + frame.imageDisplayHeight
  let x = frame.x
  let y = frame.y
  let displayWidth = frame.displayWidth
  let displayHeight = frame.displayHeight

  if (handle.includes('w')) {
    x = Math.min(Math.max(frame.x + deltaX, frame.imageX), right - minSize)
    displayWidth = right - x
  }
  if (handle.includes('e')) {
    displayWidth = Math.min(Math.max(frame.displayWidth + deltaX, minSize), imageRight - frame.x)
  }
  if (handle.includes('n')) {
    y = Math.min(Math.max(frame.y + deltaY, frame.imageY), bottom - minSize)
    displayHeight = bottom - y
  }
  if (handle.includes('s')) {
    displayHeight = Math.min(Math.max(frame.displayHeight + deltaY, minSize), imageBottom - frame.y)
  }

  return normalizeFrame({ ...frame, displayHeight, displayWidth, x, y })
}

function getDefaultFrame(width: number, height: number): PlanoBackgroundFrame {
  const scale = Math.min(WIDTH / width, HEIGHT / height)
  const displayWidth = Math.max(1, Math.round(width * scale))
  const displayHeight = Math.max(1, Math.round(height * scale))

  return {
    displayHeight,
    displayWidth,
    imageDisplayHeight: displayHeight,
    imageDisplayWidth: displayWidth,
    imageX: Math.round((WIDTH - displayWidth) / 2),
    imageY: Math.round((HEIGHT - displayHeight) / 2),
    x: Math.round((WIDTH - displayWidth) / 2),
    y: Math.round((HEIGHT - displayHeight) / 2),
  }
}

function normalizeFrame(frame: PlanoBackgroundFrame): PlanoBackgroundFrame {
  const imageDisplayWidth = Math.min(Math.max(Math.round(frame.imageDisplayWidth), 1), WIDTH)
  const imageDisplayHeight = Math.min(Math.max(Math.round(frame.imageDisplayHeight), 1), HEIGHT)
  const imageX = Math.min(Math.max(Math.round(frame.imageX), 0), Math.max(0, WIDTH - imageDisplayWidth))
  const imageY = Math.min(Math.max(Math.round(frame.imageY), 0), Math.max(0, HEIGHT - imageDisplayHeight))
  const displayWidth = Math.min(Math.max(Math.round(frame.displayWidth), 1), imageDisplayWidth)
  const displayHeight = Math.min(Math.max(Math.round(frame.displayHeight), 1), imageDisplayHeight)

  return {
    displayHeight,
    displayWidth,
    imageDisplayHeight,
    imageDisplayWidth,
    imageX,
    imageY,
    x: Math.min(Math.max(Math.round(frame.x), imageX), imageX + imageDisplayWidth - displayWidth),
    y: Math.min(Math.max(Math.round(frame.y), imageY), imageY + imageDisplayHeight - displayHeight),
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Imagen invalida')))
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(file)
  })
}

function readImageSize(src: string) {
  return new Promise<{ height: number; width: number }>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ height: image.naturalHeight, width: image.naturalWidth })
    image.onerror = () => reject(new Error('No se pudo cargar la imagen'))
    image.src = src
  })
}
