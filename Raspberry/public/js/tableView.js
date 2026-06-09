import { elements } from "./dom.js";
import { dashboardState, getItemKey } from "./state.js";
import { escapeHtml, formatCompactTime, formatValue } from "./utils.js";

const MAX_RENDERED_ROWS = 700;
let scheduledRender = null;
let scheduledPatch = null;
let pendingPatchItems = [];

export function getFilteredData() {
  const text = elements.searchInput.value.trim().toLowerCase();
  const quality = elements.qualitySelect.value;

  return dashboardState.currentData.filter((item) => {
    const matchesQuality = quality === "ALL" || item.quality === quality;
    const haystack = `${item.tag || ""} ${item.index || ""} ${item.protocol || ""} ${
      item.type || ""
    }`.toLowerCase();

    return matchesQuality && (!text || haystack.includes(text));
  });
}

function getRowDomKey(item) {
  return encodeURIComponent(getItemKey(item));
}

function buildRowHtml(item) {
  const qualityClass = item.quality === "GOOD" ? "good" : "bad";
  const value = formatValue(item.value);
  const index = item.index === null || item.index === undefined ? "--" : `%MW${item.index}`;

  return `
    <tr data-key="${escapeHtml(getRowDomKey(item))}">
      <td><span class="badge ${qualityClass}">${escapeHtml(item.quality || "N/A")}</span></td>
      <td>${escapeHtml(item.tag || "--")}</td>
      <td>${escapeHtml(value)}</td>
      <td>${escapeHtml(index)}</td>
      <td>${escapeHtml(item.type || item.protocol || "--")}</td>
      <td>${escapeHtml(formatCompactTime(item.timestamp))}</td>
    </tr>
  `;
}

function updateTableMeta(filtered) {
  elements.visibleCount.textContent = `${filtered.length} visibles`;
  elements.tableSubtitle.textContent = dashboardState.hasFullData
    ? `${dashboardState.currentData.length} registros cargados`
    : "Muestra de estado";
}

export function scheduleRenderTable() {
  if (scheduledRender !== null) return;

  scheduledRender = requestAnimationFrame(() => {
    scheduledRender = null;
    renderTable();
  });
}

export function schedulePatchRender(changes) {
  if (!Array.isArray(changes) || changes.length === 0) return;
  pendingPatchItems.push(...changes);

  if (scheduledPatch !== null) return;

  scheduledPatch = requestAnimationFrame(() => {
    scheduledPatch = null;
    const patchItems = pendingPatchItems;
    pendingPatchItems = [];
    renderPatchItems(patchItems);
  });
}

function renderPatchItems(changes) {
  if (changes.length > 24 || elements.dataBody.querySelector(".empty")) {
    renderTable();
    return;
  }

  const filtered = getFilteredData();
  updateTableMeta(filtered);
  const visibleKeys = new Set(filtered.slice(0, MAX_RENDERED_ROWS).map(getRowDomKey));

  changes.forEach((item) => {
    const rowKey = getRowDomKey(item);
    const row = elements.dataBody.querySelector(`tr[data-key="${rowKey}"]`);
    const shouldBeVisible = visibleKeys.has(rowKey);

    if (!shouldBeVisible) {
      if (row) row.remove();
      return;
    }

    if (row) {
      row.outerHTML = buildRowHtml(item);
    } else {
      renderTable();
    }
  });

  renderBadBlocks();
}

export function renderBadBlocks() {
  const badBlocks = dashboardState.currentData
    .filter((item) => item.quality !== "GOOD")
    .slice(0, 10);

  elements.badBlockCount.textContent = badBlocks.length;

  if (badBlocks.length === 0) {
    elements.badBlocks.innerHTML = "<li>No hay bloques con error.</li>";
    return;
  }

  elements.badBlocks.innerHTML = badBlocks
    .map(
      (item) => `
        <li>
          <span>${escapeHtml(item.tag || "Sin tag")}</span>
          <small>%MW${escapeHtml(item.index ?? "--")}</small>
        </li>
      `
    )
    .join("");
}

export function renderTable() {
  const filtered = getFilteredData();
  updateTableMeta(filtered);

  if (filtered.length === 0) {
    elements.dataBody.innerHTML =
      '<tr><td colspan="6" class="empty">No hay datos para mostrar.</td></tr>';
    renderBadBlocks();
    return;
  }

  elements.dataBody.innerHTML = filtered
    .slice(0, MAX_RENDERED_ROWS)
    .map(buildRowHtml)
    .join("");

  renderBadBlocks();
}
