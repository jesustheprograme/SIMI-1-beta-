import { elements } from "./dom.js";
import { dashboardState, getSummaryFromData } from "./state.js";
import {
  formatCompactTime,
  formatCountdown,
  formatDate,
  percent,
} from "./utils.js";

export function showError(message) {
  elements.errorMessage.hidden = false;
  // Agregamos "Error leyendo:" si el mensaje no lo contiene ya
  const displayMessage = message && !message.toLowerCase().includes("error") 
    ? `Error leyendo: ${message}` 
    : message;
  elements.errorMessage.textContent = displayMessage;
}

export function updateRuntimeTimers() {
  // Temporizadores visuales de la arquitectura hibrida: polling, delta y snapshot.
  const now = Date.now();

  if (dashboardState.lastMessageAt && elements.messageAge) {
    const messageAge = formatCountdown(now - dashboardState.lastMessageAt);
    if (elements.messageAge.textContent !== messageAge) {
      elements.messageAge.textContent = messageAge;
    }
  }

  const snapshotInterval = dashboardState.operationalConfig.snapshotIntervalMs;
  if (dashboardState.lastSnapshotAt && snapshotInterval) {
    const nextSnapshotAt = dashboardState.lastSnapshotAt + snapshotInterval;
    const snapshotTimer = formatCountdown(nextSnapshotAt - now);
    if (elements.snapshotTimer.textContent !== snapshotTimer) {
      elements.snapshotTimer.textContent = snapshotTimer;
    }
  }
}

export function syncTableHeight() {
  // En escritorio, la tabla termina donde termina el panel lateral.
  if (!elements.sidePanel || !elements.tableSection) return;

  if (window.innerWidth <= 980) {
    elements.tableSection.style.height = "";
    elements.tableSection.style.maxHeight = "";
    return;
  }

  const sideHeight = Math.round(elements.sidePanel.getBoundingClientRect().height);
  elements.tableSection.style.height = `${sideHeight}px`;
  elements.tableSection.style.maxHeight = `${sideHeight}px`;
}

export function applyOperationalConfig(payload) {
  const operational = payload && payload.operational;
  if (!operational) return;

  dashboardState.operationalConfig = {
    ...dashboardState.operationalConfig,
    ...operational,
  };

  elements.pollTimer.textContent = dashboardState.operationalConfig.pollIntervalMs
    ? `${dashboardState.operationalConfig.pollIntervalMs} ms`
    : "--";
  elements.rateLimitState.textContent = dashboardState.operationalConfig.maxMqttMessagesPerSecond
    ? `${dashboardState.operationalConfig.maxMqttMessagesPerSecond} msg/s`
    : "--";
}

export function updateMessageTelemetry(payload, fallbackType) {
  if (!payload) return;

  dashboardState.lastMessageAt = payload.publishedAt
    ? new Date(payload.publishedAt).getTime()
    : Date.now();
  const messageType = payload.messageType || fallbackType || payload.source || "local";
  elements.messageTypeState.textContent = messageType;
  elements.seqState.textContent = getSequenceLabel(payload, fallbackType);
  updateAvailabilityTelemetry(payload);

  if (messageType === "snapshot" || Array.isArray(payload.data)) {
    dashboardState.lastSnapshotAt = payload.publishedAt
      ? new Date(payload.publishedAt).getTime()
      : Date.now();
    elements.snapshotState.textContent = payload.publishedAt
      ? formatCompactTime(payload.publishedAt)
      : "Recibido";
  }

  updateRuntimeTimers();
}

function updateAvailabilityTelemetry(payload) {
  if (!elements.availabilityState) return;

  if (payload.lwt) {
    elements.availabilityState.textContent = "LWT offline";
    return;
  }

  if (payload.retained) {
    elements.availabilityState.textContent =
      payload.status === "MQTT_ONLINE" ? "Online retenido" : "Retenido";
    return;
  }

  elements.availabilityState.textContent = payload.mqtt?.enabled === false ? "MQTT off" : "Normal";
}

function getSequenceLabel(payload, fallbackType) {
  if (typeof payload.seq === "number") return `#${payload.seq}`;
  if (payload.messageType === "snapshot" || fallbackType === "snapshot" || Array.isArray(payload.data)) return "Snapshot";
  if (payload.messageType === "delta" || fallbackType === "delta") return "Delta";
  if (payload.source) return "Local";
  return "En vivo";
}

export function setLoading(isLoading) {
  elements.refreshButton.disabled = isLoading;
  elements.refreshButton.innerHTML = isLoading
    ? '<span class="button-icon">↻</span>Leyendo...'
    : '<span class="button-icon">↻</span>Actualizar';
  elements.runtimeState.textContent = isLoading
    ? "Leyendo PLC"
    : dashboardState.realtimeConnected
      ? "Web en vivo"
      : "Listo";
  elements.syncState.textContent = isLoading ? "Lectura en curso" : elements.syncState.textContent;
}

export function setRealtimeState(isConnected) {
  dashboardState.realtimeConnected = isConnected;
  elements.runtimeState.textContent = isConnected ? "Web en vivo" : "Reconectando";
}

export function updateStatus(payload) {
  applyOperationalConfig(payload);
  if (payload.lastSnapshotAt) {
    dashboardState.lastSnapshotAt = new Date(payload.lastSnapshotAt).getTime();
  }

  const summary = dashboardState.hasFullData
    ? getSummaryFromData(dashboardState.currentData)
    : payload.summary || {};
  const total = summary.total || 0;
  const good = summary.good || 0;
  const bad = summary.bad || 0;
  const goodShare = percent(good, total);
  const badShare = percent(bad, total);
  const mqtt = payload.mqtt || {};
  const plcs = payload.plcs || [];
  const primaryPlc = plcs[0];
  const primaryPlcName = primaryPlc?.name || "PLC";
  const plcNames = plcs.map((plc) => `${plc.name} (${plc.protocol})`).join(", ");
  const endpoints = plcs.map((plc) => plc.host).join(", ");

  elements.totalMetric.textContent = total;
  elements.goodMetric.textContent = good;
  elements.badMetric.textContent = bad;
  elements.durationMetric.textContent =
    typeof payload.lastDurationMs === "number" ? `${payload.lastDurationMs} ms` : "--";
  elements.goodPercent.textContent = `${goodShare}% del total`;
  elements.badPercent.textContent = `${badShare}% del total`;
  elements.lastRead.textContent = formatDate(payload.lastReadAt);
  elements.syncState.textContent = payload.lastReadAt
    ? `Actualizado ${formatCompactTime(payload.lastReadAt)}`
    : "Sin lectura";
  elements.qualitySummary.textContent = total
    ? `${goodShare}% de datos validos, ${bad} bloques o lecturas con error`
    : "Esperando lectura";
  elements.goodBar.style.width = `${goodShare}%`;
  elements.badBar.style.width = `${badShare}%`;
  if (elements.plcTitle) {
    elements.plcTitle.textContent = primaryPlcName;
    document.title = primaryPlcName;
  }
  elements.plcState.textContent = plcNames || "--";
  elements.plcEndpoint.textContent = endpoints || "--";
  elements.mqttState.textContent = mqtt.enabled
    ? mqtt.connected
      ? "Conectado"
      : `Desconectado${mqtt.error ? `: ${mqtt.error}` : ""}`
    : "Desactivado";

  if (payload.lastError) {
    showError(payload.lastError);
  } else {
    elements.errorMessage.hidden = true;
    elements.errorMessage.textContent = "";
  }
}

export function applyStatusView(payload) {
  const statusLabels = {
    ONLINE: "PLC online",
    DEGRADED: "Lectura degradada",
    PLC_OFFLINE: "PLC offline",
    READ_TIMEOUT: "Timeout PLC",
    MQTT_DISCONNECTED: "MQTT desconectado",
    MQTT_LWT_OFFLINE: "MQTT offline por LWT",
    MQTT_ONLINE: "MQTT online",
    UNKNOWN: "Estado desconocido",
  };

  elements.runtimeState.textContent = statusLabels[payload.status] || payload.status || "Estado PLC";
  elements.messageTypeState.textContent = payload.status || "status";

  if (payload.errorMessage) {
    // Asegurar que se muestre "Error leyendo" en errores de conexión
    if (payload.status === "PLC_OFFLINE" || payload.status === "READ_TIMEOUT") {
      showError(`Error leyendo: ${payload.errorMessage}`);
    } else {
      showError(payload.errorMessage);
    }
  }
}
