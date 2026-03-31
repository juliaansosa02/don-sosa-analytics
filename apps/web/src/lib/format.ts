export function formatDecimal(value: number, digits = 1) {
  return Number(value.toFixed(digits)).toLocaleString('es-AR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

export function formatInteger(value: number) {
  return Math.round(value).toLocaleString('es-AR');
}

export function formatPercent(value: number, digits = 1) {
  return `${formatDecimal(value, digits)}%`;
}

export function formatSignedNumber(value: number, digits = 1, suffix = '') {
  const rounded = Number(value.toFixed(digits));
  return `${rounded >= 0 ? '+' : ''}${rounded.toLocaleString('es-AR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })}${suffix}`;
}
