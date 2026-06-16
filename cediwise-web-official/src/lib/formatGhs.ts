export function formatGhs(amount: number, fractionDigits = 2): string {
  const safe = Number.isFinite(amount) ? amount : 0
  return `GHS ${safe.toLocaleString('en-GH', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`
}
