const createDataStore = require("./runtime/dataStore");
const { createDeduplicator, createMessageFactory } = require("./runtime/messageFactory");
const createReadCycle = require("./runtime/readCycle");
const createRuntimeState = require("./runtime/runtimeState");
const {
  buildOperationalStatus,
  buildStatusPayload,
  getReadStatusFromData,
} = require("./runtime/statusBuilder");
const { summarizeData } = require("./runtime/dataUtils");

function createPlcRuntime({ config, driver, io, mqttPublisher }) {
  const state = createRuntimeState();
  const context = { config, driver, state };
  const dataStore = createDataStore(config, state);
  const { buildMessage } = createMessageFactory();
  const shouldApplyMessage = createDeduplicator();
  let lastPublishedStatus = null;

  function statusPayload(sampleLimit = 200) {
    return buildStatusPayload(context, sampleLimit);
  }

  function realtimePayload(source, includeData = false) {
    return {
      ...statusPayload(0),
      source,
      data: includeData ? state.lastData : undefined,
    };
  }

  function emitStatusUpdate(source, includeData = false) {
    io.emit("status:update", realtimePayload(source, includeData));
  }

  function emitDataChanges(source, changes) {
    if (changes.length === 0) return;

    const payload = buildMessage("delta", source, {
      ...statusPayload(0),
      timestamp: state.lastReadAt,
      changed: changes.length,
      changes,
    });

    io.emit("plc:patch", payload);
    mqttPublisher.publishChanges(payload);
  }

  function publishOperationalStatus(code, options = {}) {
    const payload = buildOperationalStatus(context, buildMessage, code, options);
    const comparable = JSON.stringify({
      status: payload.status,
      quality: payload.quality,
      errorCode: payload.errorCode,
      errorMessage: payload.errorMessage,
      good: payload.summary.good,
      bad: payload.summary.bad,
    });

    if (!options.force && comparable === lastPublishedStatus) return;

    lastPublishedStatus = comparable;
    io.emit("plc:status", payload);
    mqttPublisher.publishStatus(payload);
  }

  function buildAvailabilityStatus(code, options = {}) {
    return buildOperationalStatus(context, buildMessage, code, {
      source: "mqtt-availability",
      quality: code === "MQTT_ONLINE" ? "GOOD" : "BAD",
      ...options,
    });
  }

  function publishCurrentSnapshot(source = "snapshot-interval") {
    state.lastSnapshotAt = new Date().toISOString();
    const payload = buildMessage("snapshot", source, {
      snapshotIntervalMs: config.plc.snapshotIntervalMs,
      data: state.lastData,
    });

    mqttPublisher.publishSnapshot(payload);
    emitStatusUpdate(source);
    return payload;
  }

  function applyIncomingData(data, source) {
    if (!Array.isArray(data)) return false;
    dataStore.replaceData(data);
    emitStatusUpdate(source, true);
    return true;
  }

  function applySnapshotPayload(payload, source) {
    const data = Array.isArray(payload) ? payload : payload && payload.data;
    if (!Array.isArray(data)) return false;
    if (payload && typeof payload.seq === "number" && !shouldApplyMessage(payload)) return false;
    return applyIncomingData(data, source);
  }

  const { readPlcData } = createReadCycle({
    config,
    dataStore,
    driver,
    emitDataChanges,
    emitStatusUpdate,
    publishCurrentSnapshot,
    publishOperationalStatus,
    state,
  });

  async function publishPlcData() {
    return readPlcData({ publishSnapshot: true });
  }

  async function writePlc(command) {
    const result = await driver.write(command);
    const payload = buildMessage("write-confirm", "plc-write", result);
    mqttPublisher.publishWriteConfirm(payload);
    io.emit("write:update", payload);
    if (result.status === "success") await publishPlcData();
    return result;
  }

  async function readProtocolData(protocol) {
    const startedAt = Date.now();
    const plcs = driver.plcs.filter((plc) => plc.protocol === protocol);

    if (plcs.length === 0) {
      return {
        protocol,
        plcs: [],
        data: [],
        summary: summarizeData([]),
        status: "NO_ACTIVE_PLC",
        quality: "BAD",
        errorMessage: `No hay PLC activo con protocolo ${protocol}.`,
        lastReadAt: new Date().toISOString(),
        lastDurationMs: Date.now() - startedAt,
      };
    }

    const data = await driver.read({ protocol });
    const readStatus = getReadStatusFromData(data);

    return {
      protocol,
      plcs: plcs.map((plc) => ({
        name: plc.name || plc.plcName,
        protocol: plc.protocol,
        host: plc.host || plc.endpoint,
        enabled: plc.enabled !== false,
      })),
      data,
      summary: summarizeData(data),
      status: readStatus.status,
      quality: readStatus.quality,
      errorCode: readStatus.errorCode,
      errorMessage: readStatus.errorMessage,
      lastReadAt: new Date().toISOString(),
      lastDurationMs: Date.now() - startedAt,
    };
  }

  function updateMqttState(mqttState) {
    state.mqtt = { ...state.mqtt, ...mqttState };
    emitStatusUpdate(mqttState.source || "mqtt-state");

    if (mqttState.connected === false) {
      publishOperationalStatus("MQTT_DISCONNECTED", {
        source: mqttState.source || "mqtt-state",
        quality: "BAD",
        errorCode: "MQTT_DISCONNECTED",
        errorMessage: mqttState.error || null,
        force: true,
      });
    }
  }

  return {
    state,
    buildStatusPayload: statusPayload,
    readPlcData,
    publishPlcData,
    publishCurrentSnapshot,
    buildAvailabilityStatus,
    writePlc,
    readProtocolData,
    applyIncomingData: applySnapshotPayload,
    shouldApplyMessage,
    updateMqttState,
    emitSocketSnapshot: (socket) => socket.emit("status:update", realtimePayload("socket-connect", true)),
  };
}

module.exports = createPlcRuntime;
