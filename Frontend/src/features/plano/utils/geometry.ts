import type { Point } from '../types/plano'

export function rectContainsRect(
  outer: { bottom: number; left: number; right: number; top: number },
  inner: { bottom: number; left: number; right: number; top: number },
) {
  return inner.left >= outer.left && inner.right <= outer.right && inner.top >= outer.top && inner.bottom <= outer.bottom
}

export function expandRect(rect: DOMRect, margin: number) {
  return {
    bottom: rect.bottom + margin,
    left: rect.left - margin,
    right: rect.right + margin,
    top: rect.top - margin,
  }
}

export function clampPointToCanvas(
  point: Point,
  canvasRect: DOMRect,
  itemSize: { height: number; width: number },
): Point {
  return {
    x: clamp(point.x, 0, canvasRect.width - itemSize.width),
    y: clamp(point.y, 0, canvasRect.height - itemSize.height),
  }
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
