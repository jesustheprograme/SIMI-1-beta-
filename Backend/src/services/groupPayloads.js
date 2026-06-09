const { toIsoString } = require('../utils/date');
const { stringArray } = require('./sharedPayloads');

function buildGroupDocument(item, groupId) {
  return {
    id_grupo: groupId,
    nombre: String(item.name || item.nombre || '').trim(),
    sensorTitle: String(item.sensorTitle || '').trim(),
    categories: stringArray(item.categories),
    variableIds: stringArray(item.variableIds),
    variables: stringArray(item.variables),
  };
}

function toGroupPayload(document) {
  return {
    id: document.id_grupo,
    name: document.nombre || '',
    sensorTitle: document.sensorTitle || 'Sensores',
    categories: stringArray(document.categories),
    variableIds: stringArray(document.variableIds),
    variables: stringArray(document.variables),
    createdAt: toIsoString(document.createdat_ts || document.createdat),
  };
}

module.exports = { buildGroupDocument, toGroupPayload };
