const { summarizeData } = require("./dataUtils");

function buildStatusPayload({ config, driver, state }, sampleLimit = 200) {
  return {
    running: state.running,
    lastReadAt: state.lastReadAt,
    lastSnapshotAt: state.lastSnapshotAt,
    lastDurationMs: state.lastDurationMs,
    lastError: state.lastError,
    mqtt: state.mqtt,
    plcs: driver.plcs.map((plc) => ({
      name: plc.name || plc.plcName,
      protocol: plc.protocol,
      host: plc.host || plc.endpoint,
      enabled: plc.enabled !== false,
    })),
    summary: summarizeData(state.lastData),
    sample: state.lastData.slice(0, sampleLimit),
    operational: {
      pollIntervalMs: config.plc.pollIntervalMs,
      snapshotIntervalMs: config.plc.snapshotIntervalMs,
      changeTolerance: config.plc.changeTolerance,
      maxMqttMessagesPerSecond: config.mqtt.maxMessagesPerSecond,
    },
  };
}

function getReadStatusFromData(data) {
  const summary = summarizeData(data);
  const connectionError = data.find((item) => item.tag === "__connection__" && item.quality !== "GOOD");

  if (connectionError) {
    return {
      status: String(connectionError.error || "").includes("Tiempo de espera")
        ? "READ_TIMEOUT"
        : "PLC_OFFLINE",
      quality: "BAD",
      errorCode: "PLC_READ_ERROR",
      errorMessage: connectionError.error || "PLC sin comunicacion",
    };
  }

  if (summary.good > 0 && summary.bad > 0) {
    return {
      status: "DEGRADED",
      quality: "DEGRADED",
      errorCode: "PARTIAL_BAD_QUALITY",
      errorMessage: `${summary.bad} lecturas con calidad BAD`,
    };
  }

  if (summary.good > 0) {
    return { status: "ONLINE", quality: "GOOD", errorCode: null, errorMessage: null };
  }

  return {
    status: "UNKNOWN",
    quality: "UNKNOWN",
    errorCode: "NO_DATA",
    errorMessage: "Sin datos validos del PLC",
  };
}

function buildOperationalStatus(context, buildMessage, code, options = {}) {
  const summary = summarizeData(context.state.lastData);
  const plc = context.driver.plcs[0] || {};

  return buildMessage("status", options.source || "runtime-status", {
    status: code,
    plc: plc.name || plc.plcName || "PLC",
    protocol: plc.protocol,
    host: plc.host || plc.endpoint,
    quality: options.quality || (summary.bad > 0 ? "DEGRADED" : "GOOD"),
    errorCode: options.errorCode || null,
    errorMessage: options.errorMessage || null,
    lastReadAt: context.state.lastReadAt,
    lastDurationMs: context.state.lastDurationMs,
    summary,
  });
}

module.exports = {
  buildOperationalStatus,
  buildStatusPayload,
  getReadStatusFromData,
};
