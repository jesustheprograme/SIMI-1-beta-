import type { LineDirection, PlanoLine, Point } from '../types/plano'

export const GRID_SIZE = 30
export const WIDTH = 1080
export const HEIGHT = 870

export function snapToGrid(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export function getDirection(start: Point, end: Point): LineDirection | null {
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);

  if (dx === 0 && dy === 0) return null;
  return dx >= dy ? "horizontal" : "vertical";
}

export function shouldBreakLine(line: PlanoLine, point: Point) {
  if (!line.direction) return false;

  const perpendicularDistance =
    line.direction === "horizontal"
      ? Math.abs(point.y - line.y2)
      : Math.abs(point.x - line.x2);

  return perpendicularDistance >= GRID_SIZE;
}

export function getOppositeDirection(direction: LineDirection): LineDirection {
  return direction === "horizontal" ? "vertical" : "horizontal";
}

export function buildLineByDirection<T extends PlanoLine>(line: T, point: Point, direction: LineDirection): T {
  if (direction === "horizontal") {
    return {
      ...line,
      x2: point.x,
      y2: line.y1,
      direction,
    };
  }

  return {
    ...line,
    x2: line.x1,
    y2: point.y,
    direction,
  };
}

export function isValidLine(line: PlanoLine) {
  return line.x1 !== line.x2 || line.y1 !== line.y2;
}
