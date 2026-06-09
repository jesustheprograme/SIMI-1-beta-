const DEFAULT_MAX_DECIMAL = 3276.7;
const DEFAULT_MIN_DECIMAL = -3276.8;
const DEFAULT_MODBUS_PORT = 502;
const DEFAULT_MAX_REGISTERS_PER_READ = 124;
const DEFAULT_SOCKET_TIMEOUT_MS = 5000;
const DEFAULT_BAD_BLOCK_RETRY_MS = 10000;

function normalizePlcName(plc) {
  return plc.name || plc.plcName;
}

function parseMwAddress(address) {
  if (typeof address !== "string") return null;

  const parsedAddress = parseInt(address.toUpperCase().replace("%MW", ""), 10);
  return Number.isNaN(parsedAddress) ? null : parsedAddress;
}

function isFieldDefinition(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.prototype.hasOwnProperty.call(value, "type") &&
    (Object.prototype.hasOwnProperty.call(value, "mw") ||
      Object.prototype.hasOwnProperty.call(value, "nodeId"))
  );
}

function collectModbusFields(blockDef) {
  const fields = [];

  function walk(value) {
    if (isFieldDefinition(value) && typeof value.mw === "string") {
      fields.push(value);
      return;
    }

    if (typeof value !== "object" || value === null) return;

    Object.keys(value).forEach((key) => {
      if (key !== "_topologicalAddress") walk(value[key]);
    });
  }

  walk(blockDef);
  return fields;
}

function normalizeRegisterValue(rawValue, minDecimal, maxDecimal) {
  if (typeof rawValue !== "number") {
    return { value: null, quality: "BAD" };
  }

  let signedValue = rawValue;
  if (signedValue > 32767) signedValue -= 65536;

  let decimalValue = signedValue * 0.1;
  if (decimalValue > maxDecimal || decimalValue < minDecimal) decimalValue = 0;

  return { value: decimalValue, quality: "GOOD" };
}

function createBadStatus(plc, message) {
  return {
    plc: normalizePlcName(plc),
    tag: "__connection__",
    value: null,
    index: null,
    type: null,
    protocol: plc.protocol,
    timestamp: new Date().toISOString(),
    quality: "BAD",
    error: message,
  };
}

function createBadBlockStatus(plc, blockName, index, message) {
  return {
    plc: normalizePlcName(plc),
    tag: `${blockName}.__block__`,
    value: null,
    index,
    type: null,
    protocol: plc.protocol,
    timestamp: new Date().toISOString(),
    quality: "BAD",
    error: message,
  };
}

module.exports = {
  DEFAULT_BAD_BLOCK_RETRY_MS,
  DEFAULT_MAX_DECIMAL,
  DEFAULT_MAX_REGISTERS_PER_READ,
  DEFAULT_MIN_DECIMAL,
  DEFAULT_MODBUS_PORT,
  DEFAULT_SOCKET_TIMEOUT_MS,
  collectModbusFields,
  createBadBlockStatus,
  createBadStatus,
  normalizePlcName,
  normalizeRegisterValue,
  parseMwAddress,
};
