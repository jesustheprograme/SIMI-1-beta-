const crypto = require('crypto');
const { buildStoredDateFields, parseDate } = require('../utils/date');
const { isTruthy } = require('../utils/values');

function buildOutlierDocument(item, userId) {
  const now = new Date();
  const eventAt = parseDate(item.fecha_hora || item.createdAt) || now;
  return {
    id_outlier: crypto.randomUUID(),
    sensor: String(item.sensor || item.sensorTitle || '').trim(),
    nombre: String(item.nombre || item.name || '').trim(),
    id: String(item.id || item.sensorId || '').trim(),
    ...buildStoredDateFields('fecha_hora', eventAt),
    valor: item.valor ?? item.value ?? '',
    valor_minimo: item.valor_minimo ?? item.min ?? null,
    valor_maximo: item.valor_maximo ?? item.max ?? null,
    unidad: String(item.unidad || item.unit || '').trim(),
    estado: String(item.estado || 'fuera_de_rango').trim(),
    observacion: String(item.observacion || '').trim(),
    proceso_en_ejecucion: isTruthy(item.proceso_en_ejecucion ?? item.processRunning ?? item.isProcessRunning),
    proceso_id: item.proceso_id || null,
    proceso_nombre: item.proceso_nombre || '',
    registro_numero: item.registro_numero ?? item.recordNumber ?? item.record_id ?? null,
    ubicacion: String(item.ubicacion || item.location || '').trim(),
    id_usuario: userId,
    ...buildStoredDateFields('createdat', now),
  };
}

module.exports = { buildOutlierDocument };
