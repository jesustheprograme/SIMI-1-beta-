const { buildStoredDateFields, toIsoString, toOptionalIsoString } = require('../utils/date');
const { normalizeProcessType } = require('./processRepository');
const { normalizeReadingInterval, readingArray, sensorVariableArray, stringArray } = require('./sharedPayloads');

function buildProcessDocument(item, processId) {
  const processType = normalizeProcessType(item.processType || item.tipo_proceso) || 'almacenado';
  return {
    id_proceso: processId,
    tipo_proceso: processType,
    nombre: String(item.processName || item.nombre || '').trim(),
    binCount: String(item.binCount || '').trim(),
    clientName: String(item.clientName || '').trim(),
    container: String(item.container || '').trim(),
    ...buildStoredDateFields('startat', item.createdAt),
    ...buildStoredDateFields('deadlineat', item.deadlineAt),
    destination: String(item.destination || '').trim(),
    duration: String(item.duration || '').trim(),
    finalComment: String(item.finalComment || '').trim(),
    finalObservation: String(item.finalObservation || '').trim(),
    finalOperator: String(item.finalOperator || '').trim(),
    finalReadings: readingArray(item.finalReadings),
    ...buildStoredDateFields('finishedat', item.finishedAt),
    groupIds: stringArray(item.groupIds),
    initialComment: String(item.initialComment || '').trim(),
    initialOperator: String(item.initialOperator || '').trim(),
    location: String(item.location || '').trim(),
    origin: String(item.origin || '').trim(),
    product: String(item.product || '').trim(),
    readingIntervalSeconds: normalizeReadingInterval(item.readingIntervalSeconds),
    sensorVariables: sensorVariableArray(item.sensorVariables),
    setPoint: String(item.setPoint || '').trim(),
    totalWeight: String(item.totalWeight || '').trim(),
    totalWeightUnit: item.totalWeightUnit === 't' ? 't' : 'kg',
    ventilation: String(item.ventilation || '').trim(),
  };
}

function toProcessPayload(document) {
  return {
    id: document.id_proceso,
    processType: normalizeProcessType(document.tipo_proceso) || undefined,
    processName: document.nombre || '',
    binCount: document.binCount || '',
    clientName: document.clientName || '',
    container: document.container || 'Envase 1',
    createdAt: toIsoString(document.startat_ts || document.startat || document.createdat_ts || document.createdat),
    deadlineAt: toOptionalIsoString(document.deadlineat_ts || document.deadlineat),
    destination: document.destination || '',
    duration: document.duration || '',
    finalComment: document.finalComment || '',
    finalObservation: document.finalObservation || '',
    finalOperator: document.finalOperator || '',
    finalReadings: readingArray(document.finalReadings),
    finishedAt: toOptionalIsoString(document.finishedat_ts || document.finishedat),
    groupIds: stringArray(document.groupIds),
    initialComment: document.initialComment || '',
    initialOperator: document.initialOperator || '',
    location: document.location || '',
    origin: document.origin || '',
    product: document.product || '',
    readingIntervalSeconds: normalizeReadingInterval(document.readingIntervalSeconds),
    sensorVariables: sensorVariableArray(document.sensorVariables),
    setPoint: document.setPoint || '',
    totalWeight: document.totalWeight || '',
    totalWeightUnit: document.totalWeightUnit === 't' ? 't' : 'kg',
    ventilation: document.ventilation || '70%',
  };
}

module.exports = { buildProcessDocument, toProcessPayload };
