const { buildStoredDateFields, toIsoString } = require('../utils/date');
const { buildUserReference } = require('./userReference');
const { readingArray } = require('./sharedPayloads');

function buildProcessLogDocument(item, user) {
  if (!item || typeof item !== 'object') return null;
  const processId = String(item.processId || item.proceso_id || '').trim();
  const entry = item.entry && typeof item.entry === 'object' ? item.entry : item;
  const recordId = String(entry.id || entry.id_registro || '').trim();
  if (!processId || !recordId) return null;

  return {
    id_registro: recordId,
    proceso_id: processId,
    ...buildStoredDateFields('fecha_hora', entry.createdAt || entry.fecha_hora || new Date()),
    numero_registro: Number.isFinite(Number(entry.recordNumber)) ? Number(entry.recordNumber) : null,
    lecturas: readingArray(entry.readings),
    outliers: Array.isArray(entry.outliers) ? entry.outliers : [],
    ...buildStoredDateFields('createdat', new Date()),
    createdBy: buildUserReference(user),
  };
}

function toProcessLogPayload(document) {
  return {
    id: document.id_registro,
    createdAt: toIsoString(document.fecha_hora_ts || document.fecha_hora),
    recordNumber: document.numero_registro ?? undefined,
    readings: readingArray(document.lecturas),
    outliers: Array.isArray(document.outliers) ? document.outliers : [],
  };
}

module.exports = { buildProcessLogDocument, toProcessLogPayload };
