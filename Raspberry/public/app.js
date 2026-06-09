import { elements } from "./js/dom.js";
import { dashboardState } from "./js/state.js";
import { renderTable } from "./js/tableView.js";
import { loadStatus, refreshData, startRealtime } from "./js/transport.js";
import { showError, syncTableHeight, updateRuntimeTimers } from "./js/view.js";

let statusTimer = null;
let runtimeTimerFrame = null;
let socket = null;

function startFallbackPolling() {
  statusTimer = setInterval(() => {
    if (!dashboardState.realtimeConnected && !elements.refreshButton.disabled) {
      loadStatus().catch((error) => showError(error.message));
    }
  }, 15000);
}

function startRuntimeTimer() {
  let lastPaint = 0;

  function paint(now) {
    if (now - lastPaint >= 250) {
      updateRuntimeTimers();
      lastPaint = now;
    }

    runtimeTimerFrame = requestAnimationFrame(paint);
  }

  runtimeTimerFrame = requestAnimationFrame(paint);
}

function bindUiEvents() {
  elements.refreshButton.addEventListener("click", refreshData);
  elements.searchInput.addEventListener("input", renderTable);
  elements.qualitySelect.addEventListener("change", renderTable);
  elements.telemetryToggle?.addEventListener("click", () => {
    const isExpanded = elements.telemetryToggle.getAttribute("aria-expanded") === "true";
    elements.telemetryToggle.setAttribute("aria-expanded", String(!isExpanded));
    elements.telemetryContent.dataset.collapsed = String(isExpanded);
    window.setTimeout(syncTableHeight, 260);
  });
  window.addEventListener("resize", syncTableHeight);

  if (typeof ResizeObserver === "function" && elements.sidePanel) {
    new ResizeObserver(syncTableHeight).observe(elements.sidePanel);
  }
}

function startApp() {
  bindUiEvents();
  socket = startRealtime();
  syncTableHeight();
  startRuntimeTimer();
  startFallbackPolling();

  loadStatus().catch((error) => showError(error.message));
}

window.addEventListener("beforeunload", () => {
  if (statusTimer) clearInterval(statusTimer);
  if (runtimeTimerFrame) cancelAnimationFrame(runtimeTimerFrame);
  if (socket) socket.disconnect();
});

startApp();
