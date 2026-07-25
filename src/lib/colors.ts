export function colorFromHex(hex: string, alpha = 230): [number, number, number, number] {
  const value = hex.replace('#', '')
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
    alpha,
  ]
}

export function lerpColor(
  low: [number, number, number, number],
  high: [number, number, number, number],
  t: number,
): [number, number, number, number] {
  const clamped = Math.min(1, Math.max(0, t))
  return [
    Math.round(low[0] + (high[0] - low[0]) * clamped),
    Math.round(low[1] + (high[1] - low[1]) * clamped),
    Math.round(low[2] + (high[2] - low[2]) * clamped),
    Math.round(low[3] + (high[3] - low[3]) * clamped),
  ]
}
