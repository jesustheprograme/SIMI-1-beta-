const { getDataChanges } = require("./dataUtils");
const { getReadStatusFromData } = require("./statusBuilder");

function createReadCycle(deps) {
  let readInProgress = null;

  async function readPlcData(options = {}) {
    if (readInProgress) return readInProgress;
    readInProgress = runReadCycle(options);
    return readInProgress;
  }

  async function runReadCycle(options) {
    const startedAt = Date.now();
    const { config, driver, state, dataStore } = deps;
    state.running = true;

    try {
      const previousData = state.lastData;
      const data = await driver.read({ onData: (items) => dataStore.mergeDataItems(items) });
      const changes = getDataChanges(previousData, data, config.plc.changeTolerance);
      const isInitialRead = previousData.length === 0;

      state.lastData = data;
      dataStore.rebuildDataIndex(data);
      state.lastReadAt = new Date().toISOString();
      state.lastDurationMs = Date.now() - startedAt;
      const readStatus = getReadStatusFromData(data);
      state.lastError = readStatus.quality === "BAD" ? readStatus.errorMessage : null;

      handleReadResult(data, changes, isInitialRead, options);
      return data;
    } catch (error) {
      handleReadError(error);
      throw error;
    } finally {
      state.running = false;
      readInProgress = null;
    }
  }

  function handleReadResult(data, changes, isInitialRead, options) {
    if (!isInitialRead && changes.length === 0 && !options.publishSnapshot) {
      deps.emitStatusUpdate("plc-read-no-change");
      return;
    }

    const source = getReadSource(isInitialRead, options);
    deps.emitStatusUpdate(source, isInitialRead);
    if (isInitialRead || options.publishSnapshot) deps.publishCurrentSnapshot(source);
    deps.emitDataChanges(source, changes);
    publishReadStatus(data, source);
  }

  function getReadSource(isInitialRead, options) {
    if (isInitialRead) return "plc-initial-read";
    return options.publishSnapshot ? "plc-snapshot" : "plc-change";
  }

  function publishReadStatus(data, source) {
    const readStatus = getReadStatusFromData(data);
    deps.publishOperationalStatus(readStatus.status, {
      source,
      quality: readStatus.quality,
      errorCode: readStatus.errorCode,
      errorMessage: readStatus.errorMessage,
    });
  }

  function handleReadError(error) {
    deps.state.lastError = error.message;
    deps.emitStatusUpdate("plc-read-error");
    deps.publishOperationalStatus(error.message.includes("Tiempo de espera") ? "READ_TIMEOUT" : "PLC_OFFLINE", {
      source: "plc-read-error",
      quality: "BAD",
      errorCode: error.code || "PLC_READ_ERROR",
      errorMessage: error.message,
      force: true,
    });
  }

  return { readPlcData };
}

module.exports = createReadCycle;
