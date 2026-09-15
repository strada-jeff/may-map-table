/**
 * 2D affine transforms, enough to bake SVG group transforms into coordinates.
 *
 * The browser would do this via getCTM(), but getCTM() returns null on
 * non-rendered elements — which is exactly what a hidden routing layer is — so
 * extraction composes the matrices itself and stays runnable in plain Node.
 *
 * Matrix is [a, b, c, d, e, f] as in SVG: x' = a*x + c*y + e, y' = b*x + d*y + f.
 */
export type Matrix = readonly [number, number, number, number, number, number]

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]

export function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ]
}

export function applyMatrix(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
}

const TRANSFORM_PATTERN = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g

function numbers(raw: string): number[] {
  return raw
    .split(/[\s,]+/)
    .map((token) => Number.parseFloat(token))
    .filter((value) => !Number.isNaN(value))
}

const DEG = Math.PI / 180

/**
 * Parse an SVG `transform` attribute. Functions apply left to right, i.e.
 * `translate(...) rotate(...)` rotates first in local space then translates.
 */
export function parseTransform(value: string | null | undefined): Matrix {
  if (!value) return IDENTITY
  let result: Matrix = IDENTITY
  TRANSFORM_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = TRANSFORM_PATTERN.exec(value)) !== null) {
    const args = numbers(match[2]!)
    result = multiply(result, toMatrix(match[1]!, args))
  }
  return result
}

function toMatrix(name: string, args: number[]): Matrix {
  switch (name) {
    case 'matrix':
      return args.length === 6 ? (args as unknown as Matrix) : IDENTITY
    case 'translate':
      return [1, 0, 0, 1, args[0] ?? 0, args[1] ?? 0]
    case 'scale': {
      const sx = args[0] ?? 1
      return [sx, 0, 0, args[1] ?? sx, 0, 0]
    }
    case 'rotate': {
      const angle = (args[0] ?? 0) * DEG
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const rotation: Matrix = [cos, sin, -sin, cos, 0, 0]
      // rotate(angle, cx, cy) rotates about a point rather than the origin.
      if (args.length >= 3) {
        const cx = args[1]!
        const cy = args[2]!
        return multiply(
          multiply([1, 0, 0, 1, cx, cy], rotation),
          [1, 0, 0, 1, -cx, -cy],
        )
      }
      return rotation
    }
    case 'skewX':
      return [1, 0, Math.tan((args[0] ?? 0) * DEG), 1, 0, 0]
    case 'skewY':
      return [1, Math.tan((args[0] ?? 0) * DEG), 0, 1, 0, 0]
    default:
      return IDENTITY
  }
}
