export function formatNumber(value: number) {
  return value.toLocaleString('en-US')
}

export function formatCurrency(value: number) {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

export function formatIndex(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
}
