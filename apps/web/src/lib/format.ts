function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function formatDecimal(value: number | null | undefined, digits = 1) {
  if (!isValidNumber(value)) return '—';
  return Number(value.toFixed(digits)).toLocaleString('es-AR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

export function formatInteger(value: number | null | undefined) {
  if (!isValidNumber(value)) return '—';
  return Math.round(value).toLocaleString('es-AR');
}

export function formatPercent(value: number | null | undefined, digits = 1) {
  if (!isValidNumber(value)) return '—';
  return `${formatDecimal(value, digits)}%`;
}

export function formatSignedNumber(value: number | null | undefined, digits = 1, suffix = '') {
  if (!isValidNumber(value)) return '—';
  const rounded = Number(value.toFixed(digits));
  return `${rounded >= 0 ? '+' : ''}${rounded.toLocaleString('es-AR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })}${suffix}`;
}
