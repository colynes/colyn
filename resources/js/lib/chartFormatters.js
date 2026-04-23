const compactAxisNumber = new Intl.NumberFormat('en-TZ', {
  maximumFractionDigits: 1,
});

export function formatCompactAxisValue(value) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return String(value ?? '');
  }

  const sign = amount < 0 ? '-' : '';
  const absoluteAmount = Math.abs(amount);

  if (absoluteAmount >= 1000000) {
    return `${sign}${compactAxisNumber.format(absoluteAmount / 1000000)}M`;
  }

  if (absoluteAmount >= 1000) {
    return `${sign}${compactAxisNumber.format(absoluteAmount / 1000)}k`;
  }

  return `${sign}${compactAxisNumber.format(absoluteAmount)}`;
}
