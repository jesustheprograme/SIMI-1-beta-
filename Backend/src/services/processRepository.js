const { processTypes } = require('../config/env');
const { getCollections } = require('../db/state');
const { parseDate } = require('../utils/date');

function normalizeProcessType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return processTypes.has(normalized) ? normalized : null;
}

function getProcessCollection(type) {
  const { almacenadoProcessesCollection, maduracionProcessesCollection, proceso3ProcessesCollection } = getCollections();
  if (type === 'maduracion') return maduracionProcessesCollection;
  if (type === 'proceso-3') return proceso3ProcessesCollection;
  return almacenadoProcessesCollection;
}

async function loadProcessesFromCollection(collection) {
  return collection.find({}).sort({ createdat_ts: -1, createdat: -1 }).toArray();
}

async function loadAllProcesses() {
  const { legacyProcessesCollection, almacenadoProcessesCollection, maduracionProcessesCollection, proceso3ProcessesCollection } = getCollections();
  const [almacenado, maduracion, proceso3, legacy] = await Promise.all([
    loadProcessesFromCollection(almacenadoProcessesCollection),
    loadProcessesFromCollection(maduracionProcessesCollection),
    loadProcessesFromCollection(proceso3ProcessesCollection),
    legacyProcessesCollection.find({}).sort({ createdat: -1 }).toArray(),
  ]);

  const deduped = new Map();
  for (const document of [...almacenado, ...maduracion, ...proceso3, ...legacy]) {
    const processId = String(document.id_proceso || '').trim();
    if (processId && !deduped.has(processId)) deduped.set(processId, document);
  }

  return Array.from(deduped.values()).sort((first, second) => getProcessSortTime(second) - getProcessSortTime(first));
}

async function findExistingProcess(processId) {
  const { legacyProcessesCollection, almacenadoProcessesCollection, maduracionProcessesCollection, proceso3ProcessesCollection } = getCollections();
  const processCollections = [
    { collection: almacenadoProcessesCollection, type: 'almacenado' },
    { collection: maduracionProcessesCollection, type: 'maduracion' },
    { collection: proceso3ProcessesCollection, type: 'proceso-3' },
    { collection: legacyProcessesCollection, type: null },
  ];

  for (const candidate of processCollections) {
    const document = await candidate.collection.findOne({ id_proceso: processId });
    if (document) return { ...candidate, document };
  }

  return null;
}

function getProcessSortTime(document) {
  const date = parseDate(document.startat_ts || document.startat || document.createdat_ts || document.createdat);
  return date?.getTime() || 0;
}

module.exports = {
  findExistingProcess,
  getProcessCollection,
  loadAllProcesses,
  loadProcessesFromCollection,
  normalizeProcessType,
};
