/** US state / DC flag (PNG) via FlagCDN — no API key required. */
export function stateFlagUrl(stateCode: string) {
  return `https://flagcdn.com/w80/us-${stateCode.toLowerCase()}.png`
}
