/** Strip internal BLS LAUS series codes (e.g. LAUCN270530000000003) from
 * citation text so they never appear in rendered HTML / meta. */
export function publicSourceLabel(value: string): string {
  return value
    .replace(/\bLAUCN\d+\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s+,/g, ',')
    .trim()
}
