const crypto = require('crypto');
const { getCollections } = require('./state');

async function normalizeLegacyDateFields() {
  const { usersCollection, outliersCollection, groupsCollection, legacyProcessesCollection, almacenadoProcessesCollection, maduracionProcessesCollection, proceso3ProcessesCollection } =
    getCollections();

  await Promise.all([
    copyLegacyDateField(usersCollection, 'createdAt', 'createdat'),
    copyLegacyDateField(outliersCollection, 'createdAt', 'createdat'),
    groupsCollection.updateMany({ totalvariables: { $exists: true } }, { $unset: { totalvariables: '' } }),
    normalizeProcessCollection(legacyProcessesCollection),
    normalizeProcessCollection(almacenadoProcessesCollection),
    normalizeProcessCollection(maduracionProcessesCollection),
    normalizeProcessCollection(proceso3ProcessesCollection),
  ]);
}

async function normalizeProcessCollection(collection) {
  await Promise.all([
    collection.updateMany({ totalvariables: { $exists: true } }, { $unset: { totalvariables: '' } }),
    collection.updateMany(
      {
        $or: [{ readingIntervalSeconds: { $exists: false } }, { readingIntervalSeconds: { $lt: 1 } }],
      },
      { $set: { readingIntervalSeconds: 5 } },
    ),
  ]);
}

async function copyLegacyDateField(collection, sourceField, targetField) {
  await collection.updateMany(
    { [targetField]: { $exists: false }, [sourceField]: { $exists: true } },
    [
      {
        $set: {
          [targetField]: {
            $convert: { input: `$${sourceField}`, to: 'date', onError: `$${sourceField}`, onNull: `$${sourceField}` },
          },
        },
      },
    ],
  );
}

async function backfillMissingUserIds() {
  const { usersCollection } = getCollections();
  const usersWithoutId = await usersCollection
    .find({ $or: [{ id_usuario: { $exists: false } }, { id_usuario: null }, { id_usuario: '' }] })
    .project({ _id: 1 })
    .toArray();

  if (usersWithoutId.length === 0) return;

  await usersCollection.bulkWrite(
    usersWithoutId.map((user) => ({
      updateOne: { filter: { _id: user._id }, update: { $set: { id_usuario: crypto.randomUUID() } } },
    })),
  );
}

async function ensureDniIndex() {
  const { usersCollection } = getCollections();
  const indexName = 'dni_1';
  const indexes = await usersCollection.indexes();
  const currentIndex = indexes.find((index) => index.name === indexName);
  const expected = JSON.stringify({ dni: { $exists: true, $gt: '' } });

  if (currentIndex && JSON.stringify(currentIndex.partialFilterExpression) !== expected) {
    await usersCollection.dropIndex(indexName);
  }

  await usersCollection.createIndex(
    { dni: 1 },
    { name: indexName, unique: true, partialFilterExpression: { dni: { $exists: true, $gt: '' } } },
  );
}

module.exports = { backfillMissingUserIds, ensureDniIndex, normalizeLegacyDateFields };
