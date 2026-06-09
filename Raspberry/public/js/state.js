export const dashboardState = {
  currentData: [],
  hasFullData: false,
  realtimeConnected: false,
  lastAppliedSeq: 0,
  lastAppliedSessionId: null,
  lastMessageAt: null,
  lastSnapshotAt: null,
  operationalConfig: {
    pollIntervalMs: null,
    snapshotIntervalMs: null,
    maxMqttMessagesPerSecond: null,
  },
};

export function shouldApplyPayload(payload) {
  // Evita aplicar dos veces mensajes MQTT QoS 1 o snapshots retenidos viejos.
  if (!payload || typeof payload.seq !== "number") return true;

  if (payload.sessionId && payload.sessionId !== dashboardState.lastAppliedSessionId) {
    dashboardState.lastAppliedSessionId = payload.sessionId;
    dashboardState.lastAppliedSeq = 0;
  }

  if (payload.seq <= dashboardState.lastAppliedSeq) return false;

  dashboardState.lastAppliedSeq = payload.seq;
  return true;
}

export function getItemKey(item) {
  return `${item.plc || ""}|${item.tag || ""}|${item.index ?? ""}|${item.protocol || ""}`;
}

export function getSummaryFromData(data) {
  return data.reduce(
    (summary, item) => {
      summary.total += 1;
      if (item.quality === "GOOD") summary.good += 1;
      else summary.bad += 1;
      return summary;
    },
    { total: 0, good: 0, bad: 0 }
  );
}

export function mergePatchItems(changes) {
  const dataMap = new Map(dashboardState.currentData.map((item) => [getItemKey(item), item]));
  changes.forEach((item) => dataMap.set(getItemKey(item), item));

  dashboardState.currentData = Array.from(dataMap.values());
  dashboardState.hasFullData = true;
}

export function replaceData(data) {
  dashboardState.currentData = data;
  dashboardState.hasFullData = true;
}
