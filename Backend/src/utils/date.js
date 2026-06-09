const { storedDatePattern } = require('../config/env');

function parseDate(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = value.trim().match(storedDatePattern);
    if (match) {
      const [, day, month, year, hour, minute] = match;
      const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatStoredDate(value) {
  const date = parseDate(value);
  if (!date) return null;
  const day = String(date.getDate());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} - ${hours}:${minutes}`;
}

function buildStoredDateFields(field, value) {
  const date = parseDate(value);
  return {
    [field]: date ? formatStoredDate(date) : null,
    [`${field}_ts`]: date,
  };
}

function toIsoString(value) {
  return (parseDate(value) || new Date()).toISOString();
}

function toOptionalIsoString(value) {
  return parseDate(value)?.toISOString();
}

module.exports = {
  buildStoredDateFields,
  formatStoredDate,
  parseDate,
  toIsoString,
  toOptionalIsoString,
};
