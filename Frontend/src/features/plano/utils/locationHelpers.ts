import type { PlanoLocationZone, Point } from '../types/plano'

export function getNextLocationName(zones: PlanoLocationZone[]) {
  const used = new Set(zones.map((zone) => zone.name))
  let index = zones.length + 1
  let name = `Ubicado ${index}`

  while (used.has(name)) {
    index += 1
    name = `Ubicado ${index}`
  }

  return name
}

export function pointIsInsideZone(point: Point, zone: PlanoLocationZone) {
  return point.x >= zone.x && point.x <= zone.x + zone.width && point.y >= zone.y && point.y <= zone.y + zone.height
}

export function buildLocationZoneFromPoints(
  start: Point,
  end: Point,
  base: PlanoLocationZone,
): PlanoLocationZone {
  return {
    ...base,
    height: Math.abs(end.y - start.y),
    width: Math.abs(end.x - start.x),
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
  }
}
