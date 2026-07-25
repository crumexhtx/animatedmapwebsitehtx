export function formatNumber(value: number) {
  return value.toLocaleString('en-US')
}

export function formatMetric(value: number) {
  const abs = Math.abs(value)
  if (abs >= 100) return Math.round(value).toLocaleString('en-US')
  return value.toFixed(1)
}
