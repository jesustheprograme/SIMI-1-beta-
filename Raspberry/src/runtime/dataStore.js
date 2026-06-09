const { getDataKey, hasMeaningfulChange } = require("./dataUtils");

function createDataStore(config, state) {
  const dataByKey = new Map();

  function rebuildDataIndex(data) {
    dataByKey.clear();
    data.forEach((item) => dataByKey.set(getDataKey(item), item));
  }

  function updateStateFromIndex() {
    state.lastData = Array.from(dataByKey.values());
  }

  function replaceData(data) {
    state.lastData = data;
    rebuildDataIndex(data);
    state.lastReadAt = new Date().toISOString();
    state.lastDurationMs = null;
    state.lastError = null;
  }

  function mergeDataItems(items) {
    if (!Array.isArray(items) || items.length === 0) return [];

    const changes = [];
    items.forEach((item) => {
      const key = getDataKey(item);
      const previous = dataByKey.get(key);

      if (hasMeaningfulChange(previous, item, config.plc.changeTolerance)) {
        dataByKey.set(key, item);
        changes.push(item);
      }
    });

    if (changes.length > 0) {
      updateStateFromIndex();
      state.lastReadAt = new Date().toISOString();
      state.lastError = null;
    }

    return changes;
  }

  return {
    mergeDataItems,
    rebuildDataIndex,
    replaceData,
  };
}

module.exports = createDataStore;
