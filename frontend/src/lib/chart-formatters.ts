export function formatCompactAxisValue(value: string | number | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  const numeric = Number(raw);

  if (!Number.isFinite(numeric)) {
    return String(raw);
  }

  if (Math.abs(numeric) < 1000) {
    return numeric.toLocaleString("pt-BR");
  }

  return `${(numeric / 1000).toLocaleString("en-US", {
    useGrouping: false,
    maximumFractionDigits: Math.abs(numeric) < 10000 ? 1 : 0,
  })}k`;
}
