import { elements } from "./dom.js";
import { dashboardState, mergePatchItems, replaceData, shouldApplyPayload } from "./state.js";
import {
  applyStatusView,
  setLoading,
  setRealtimeState,
  showError,
  updateMessageTelemetry,
  updateStatus,
} from "./view.js";
import { schedulePatchRender, scheduleRenderTable } from "./tableView.js";

export function applyRealtimePayload(payload) {
  // Snapshot o estado completo: base inicial de la tabla.
  if (!shouldApplyPayload(payload)) return;
  updateMessageTelemetry(payload, Array.isArray(payload.data) ? "snapshot" : "status");

  if (Array.isArray(payload.data)) {
    replaceData(payload.data);
  } else if (
    !dashboardState.hasFullData &&
    Array.isArray(payload.sample) &&
    payload.sample.length > 0
  ) {
    dashboardState.currentData = payload.sample;
  }

  updateStatus(payload);
  scheduleRenderTable();
}

export function applyPatchPayload(payload) {
  // Delta: actualiza solo los tags modificados.
  if (!shouldApplyPayload(payload)) return;
  updateMessageTelemetry(payload, "delta");

  const changes = Array.isArray(payload.changes) ? payload.changes : [];
  if (changes.length === 0) {
    updateStatus(payload);
    return;
  }

  mergePatchItems(changes);
  elements.deltaState.textContent = `${changes.length} cambios`;
  elements.syncState.textContent = `${changes.length} cambios detectados`;
  updateStatus(payload);
  schedulePatchRender(changes);
}

export function applyStatusPayload(payload) {
  // Estado operacional publicado por topic_plc_status.
  if (!shouldApplyPayload(payload)) return;
  updateMessageTelemetry(payload, "status");
  applyStatusView(payload);
}

export async function loadStatus() {
  const response = await fetch("/api/status");
  if (!response.ok) throw new Error("No se pudo cargar el estado.");

  const payload = await response.json();
  applyRealtimePayload(payload);
}

export async function refreshData() {
  setLoading(true);

  try {
    const response = await fetch("/api/read", { method: "POST" });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "No se pudo leer el PLC.");
    }

    const payload = await response.json();
    applyRealtimePayload(payload);
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
}

export function startRealtime() {
  if (typeof io !== "function") return;

  const socket = io();

  socket.on("connect", () => setRealtimeState(true));
  socket.on("disconnect", () => setRealtimeState(false));
  socket.on("status:update", applyRealtimePayload);

  socket.on("write:update", (payload) => {
    updateMessageTelemetry(payload, "write-confirm");
    elements.syncState.textContent =
      payload.status === "success" ? "Escritura confirmada" : "Error de escritura";
  });

  socket.on("plc:patch", applyPatchPayload);
  socket.on("plc:changes", applyPatchPayload);
  socket.on("plc:status", applyStatusPayload);

  return socket;
}
