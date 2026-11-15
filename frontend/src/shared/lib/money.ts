const formatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })

export function formatMoney(kopecks: number): string {
  const rubles = kopecks / 100
  const hasCents = kopecks % 100 !== 0
  return `${formatter.format(hasCents ? rubles : Math.round(rubles))} ₽`
}

export function rublesToKopecks(rubles: number): number {
  return Math.round(rubles * 100)
}

export function parseRubles(text: string): number | null {
  const normalized = text.replace(/\s|\u00a0/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null
  }
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}
