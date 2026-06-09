function normalizeReadingInterval(value) {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 1 ? Math.round(seconds) : 5;
}

function isTruthy(value) {
  return value === true || String(value).toLowerCase() === 'true' || value === 1 || value === '1';
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

module.exports = { hasValue, isTruthy, normalizeReadingInterval };
