export function formatDate(value) {
  if (!value) return "Sin lectura";
  return new Date(value).toLocaleString();
}

export function formatCompactTime(value) {
  if (!value) return "Sin lectura";
  return new Date(value).toLocaleTimeString();
}

export function formatValue(value) {
  if (value === null || value === undefined || value === "") return "--";

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;

  return numericValue.toFixed(1);
}

export function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function formatCountdown(ms) {
  if (!Number.isFinite(ms)) return "--";
  if (ms <= 0) return "ahora";

  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
