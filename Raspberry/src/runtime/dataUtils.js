function summarizeData(data) {
  return data.reduce(
    (summary, item) => {
      summary.total += 1;
      summary.byQuality[item.quality] = (summary.byQuality[item.quality] || 0) + 1;
      summary.byProtocol[item.protocol] = (summary.byProtocol[item.protocol] || 0) + 1;

      if (item.quality === "GOOD") summary.good += 1;
      else summary.bad += 1;

      return summary;
    },
    { total: 0, good: 0, bad: 0, byQuality: {}, byProtocol: {} }
  );
}

function getDataKey(item) {
  return `${item.plc || ""}|${item.tag || ""}|${item.index ?? ""}|${item.protocol || ""}`;
}

function getComparableValue(item) {
  return JSON.stringify({
    value: item.value,
    quality: item.quality,
    error: item.error || null,
  });
}

function isDigitalValue(value) {
  return value === 0 || value === 1 || value === true || value === false;
}

function hasMeaningfulChange(previous, next, tolerance = 0) {
  // Publica cambios digitales exactos y analogicos solo si superan tolerancia.
  if (!previous) return true;
  if (previous.quality !== next.quality) return true;
  if ((previous.error || null) !== (next.error || null)) return true;

  const previousValue = previous.value;
  const nextValue = next.value;

  if (isDigitalValue(previousValue) && isDigitalValue(nextValue)) {
    return previousValue !== nextValue;
  }

  const previousNumber = Number(previousValue);
  const nextNumber = Number(nextValue);

  if (Number.isFinite(previousNumber) && Number.isFinite(nextNumber)) {
    return Math.abs(nextNumber - previousNumber) >= Math.max(0, tolerance || 0);
  }

  return getComparableValue(previous) !== getComparableValue(next);
}

function getDataChanges(previousData, nextData, tolerance = 0) {
  // Comparacion determinista contra el snapshot local anterior.
  const previousMap = new Map(previousData.map((item) => [getDataKey(item), item]));

  return nextData.filter((item) => hasMeaningfulChange(previousMap.get(getDataKey(item)), item, tolerance));
}

module.exports = {
  getDataChanges,
  getDataKey,
  hasMeaningfulChange,
  summarizeData,
};
