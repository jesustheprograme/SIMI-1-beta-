const { normalizePlcName } = require("./shared");

let opcuaModule = null;

function loadOpcUa() {
  if (!opcuaModule) opcuaModule = require("node-opcua");
  return opcuaModule;
}

async function ensureOpcUaSession(driver, plc) {
  const plcName = normalizePlcName(plc);

  if (driver.opcuaSessions.has(plcName)) return driver.opcuaSessions.get(plcName);
  if (!plc.endpoint) throw new Error(`El PLC ${plcName} no tiene endpoint OPC UA.`);

  const { OPCUAClient } = loadOpcUa();
  const client = OPCUAClient.create({
    endpointMustExist: false,
    connectionStrategy: { initialDelay: 500, maxRetry: 1 },
    requestedSessionTimeout: plc.sessionTimeoutMs || 30000,
  });

  await client.connect(plc.endpoint);
  const session = await client.createSession();

  driver.opcuaClients.set(plcName, client);
  driver.opcuaSessions.set(plcName, session);
  return session;
}

async function readOpcUa(driver, plc) {
  const plcName = normalizePlcName(plc);
  const session = await ensureOpcUaSession(driver, plc);
  const { AttributeIds } = loadOpcUa();
  const tags = Array.isArray(plc.tags) ? plc.tags : [];
  const data = [];

  for (const tagConfig of tags) {
    if (!tagConfig.nodeId) continue;

    const dataValue = await session.read({
      nodeId: tagConfig.nodeId,
      attributeId: AttributeIds.Value,
    });
    const variant = dataValue.value;
    const timestamp = dataValue.sourceTimestamp || dataValue.serverTimestamp || new Date();

    data.push({
      plc: plcName,
      tag: tagConfig.tag || tagConfig.nodeId,
      value: variant ? variant.value : null,
      index: tagConfig.index || null,
      type: tagConfig.type || (variant && String(variant.dataType)) || null,
      protocol: plc.protocol,
      nodeId: tagConfig.nodeId,
      timestamp: timestamp.toISOString(),
      quality: dataValue.statusCode ? dataValue.statusCode.name : "UNKNOWN",
    });
  }

  return data;
}

async function writeOpcUa(driver, plc, command) {
  const session = await ensureOpcUaSession(driver, plc);
  const { AttributeIds, DataType, Variant } = loadOpcUa();
  const nodeId = command.nodeId || findNodeIdByTag(plc, command.tag);

  if (!nodeId) throw new Error("El comando OPC UA requiere nodeId o tag configurado.");

  const dataType = resolveOpcUaDataType(command.type, DataType);
  const value = coerceOpcUaValue(command.value, dataType, DataType);
  const statusCode = await session.write({
    nodeId,
    attributeId: AttributeIds.Value,
    value: { value: new Variant({ dataType, value }) },
  });

  return {
    ...command,
    plc: normalizePlcName(plc),
    protocol: plc.protocol,
    nodeId,
    status: statusCode && statusCode.name === "Good" ? "success" : "error",
    quality: statusCode ? statusCode.name : "UNKNOWN",
    timestamp: new Date().toISOString(),
  };
}

function findNodeIdByTag(plc, tag) {
  const tags = Array.isArray(plc.tags) ? plc.tags : [];
  const match = tags.find((tagConfig) => tagConfig.tag === tag);
  return match ? match.nodeId : null;
}

function resolveOpcUaDataType(type, DataType) {
  const normalizedType = String(type || "Double").toUpperCase();
  if (normalizedType === "BOOL" || normalizedType === "BOOLEAN") return DataType.Boolean;
  if (normalizedType === "INT" || normalizedType === "INT16") return DataType.Int16;
  if (normalizedType === "DINT" || normalizedType === "INT32") return DataType.Int32;
  if (normalizedType === "REAL" || normalizedType === "FLOAT") return DataType.Float;
  if (normalizedType === "STRING") return DataType.String;
  return DataType.Double;
}

function coerceOpcUaValue(value, dataType, DataType) {
  if (dataType === DataType.Boolean) {
    return value === true || value === "true" || value === 1 || value === "1";
  }
  if ([DataType.Int16, DataType.Int32, DataType.Float, DataType.Double].includes(dataType)) {
    return Number(value);
  }
  if (dataType === DataType.String) return String(value);
  return value;
}

module.exports = { ensureOpcUaSession, readOpcUa, writeOpcUa };
