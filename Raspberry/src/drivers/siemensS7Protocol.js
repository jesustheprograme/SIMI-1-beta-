// Lee variables de PLC Siemens S7 usando nodeS7 por S7 Communication.

const nodes7 = require("nodes7");
const { createBadStatus, normalizePlcName } = require("./shared");

const DEFAULT_S7_PORT = 102;
const DEFAULT_S7_RACK = 0;
const DEFAULT_S7_SLOT = 1;
const DEFAULT_S7_TIMEOUT_MS = 5000;

async function readSiemensS7(driver, plc, options = {}) {
  const plcName = normalizePlcName(plc);
  const variables = buildVariableMap(plc.tags || []);

  if (Object.keys(variables).length === 0) {
    return [createBadStatus(plc, `PLC ${plcName} no tiene tags Siemens S7 configurados.`)];
  }

  const connection = await ensureSiemensConnection(driver, plc, plcName, variables);

  try {
    const values = await readAllItems(connection);
    const data = buildDataItems(plc, plcName, plc.tags, values);
    emitSiemensData(options, data, plc, plcName);
    return data;
  } catch (error) {
    closeSiemens(connection);
    driver.siemensConnections.delete(plcName);
    throw error;
  }
}

function buildVariableMap(tags) {
  return tags.reduce((variables, item) => {
    if (item && item.tag && item.address) variables[item.tag] = item.address;
    return variables;
  }, {});
}

async function ensureSiemensConnection(driver, plc, plcName, variables) {
  const cachedConnection = driver.siemensConnections.get(plcName);
  if (cachedConnection) return cachedConnection;

  const connection = new nodes7();
  await connectSiemens(connection, plc);
  connection.setTranslationCB((tag) => variables[tag]);
  connection.addItems(Object.keys(variables));
  driver.siemensConnections.set(plcName, connection);
  return connection;
}

function connectSiemens(connection, plc) {
  const params = {
    host: plc.host,
    port: plc.port || DEFAULT_S7_PORT,
    rack: plc.rack ?? DEFAULT_S7_RACK,
    slot: plc.slot ?? DEFAULT_S7_SLOT,
    timeout: plc.timeoutMs || DEFAULT_S7_TIMEOUT_MS,
    debug: plc.debug === true,
  };

  return new Promise((resolve, reject) => {
    connection.initiateConnection(params, (error) => {
      error ? reject(createSiemensError(error, plc)) : resolve();
    });
  });
}

function createSiemensError(error, plc) {
  if (error instanceof Error && error.message) return error;
  const detail = typeof error === "string" ? error : JSON.stringify(error);
  return new Error(`No se pudo conectar a Siemens S7 ${plc.host}:${plc.port || DEFAULT_S7_PORT} (${detail})`);
}

function readAllItems(connection) {
  return new Promise((resolve, reject) => {
    connection.readAllItems((anythingBad, values) => {
      if (anythingBad) {
        reject(new Error("Lectura Siemens S7 con calidad BAD o conexion no disponible."));
        return;
      }
      resolve(values || {});
    });
  });
}

function buildDataItems(plc, plcName, tags, values) {
  return tags.map((item) => ({
    plc: plcName,
    tag: item.tag,
    value: values[item.tag] ?? null,
    index: item.address,
    type: item.type || null,
    protocol: plc.protocol,
    timestamp: new Date().toISOString(),
    quality: Object.prototype.hasOwnProperty.call(values, item.tag) ? "GOOD" : "BAD",
  }));
}

function emitSiemensData(options, data, plc, plcName) {
  if (typeof options.onData !== "function" || data.length === 0) return;
  options.onData(data, { plc: plcName, protocol: plc.protocol });
}

function closeSiemens(connection) {
  if (typeof connection.dropConnection === "function") connection.dropConnection();
}

module.exports = { readSiemensS7 };
