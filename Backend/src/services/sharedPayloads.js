const { normalizeReadingInterval } = require('../utils/values');

function stringArray(value) {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function sensorVariableArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: String(item.id || '').trim(),
      name: String(item.name || '').trim(),
      sensorTitle: String(item.sensorTitle || '').trim(),
    }))
    .filter((item) => item.id && item.name);
}

function readingArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: String(item.id || '').trim(),
      name: String(item.name || '').trim(),
      sensorTitle: String(item.sensorTitle || '').trim(),
      unit: String(item.unit || '').trim(),
      value: String(item.value ?? '').trim(),
    }))
    .filter((item) => item.id && item.name);
}

function workspaceConfigurationPayload(document) {
  return {
    activePlanDraft: document?.activePlanDraft ?? null,
    groupSections: groupSectionArray(document?.groupSections),
    locationZones: Array.isArray(document?.locationZones) ? document.locationZones : [],
    processSections: processSectionArray(document?.processSections),
    savedPlans: Array.isArray(document?.savedPlans) ? document.savedPlans : [],
    sensorOverrides:
      document?.sensorOverrides && typeof document.sensorOverrides === 'object' && !Array.isArray(document.sensorOverrides)
        ? document.sensorOverrides
        : {},
  };
}

function groupSectionArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      groupIds: stringArray(item.groupIds),
      id: String(item.id || '').trim(),
      title: String(item.title || '').trim(),
    }))
    .filter((item) => item.id && item.title);
}

function processSectionArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: String(item.id || '').trim(),
      processIds: stringArray(item.processIds),
      processType: ['almacenado', 'maduracion', 'proceso-3'].includes(String(item.processType || '').trim())
        ? String(item.processType).trim()
        : undefined,
      title: String(item.title || '').trim(),
    }))
    .filter((item) => item.id && item.title);
}

module.exports = {
  groupSectionArray,
  normalizeReadingInterval,
  processSectionArray,
  readingArray,
  sensorVariableArray,
  stringArray,
  workspaceConfigurationPayload,
};
