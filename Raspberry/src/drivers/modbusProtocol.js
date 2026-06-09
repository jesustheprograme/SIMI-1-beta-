//PLC JEPKOM (MODBUSTCP) -

const net = require("net");
const modbusClient = require("jsmodbus");

const {
  DEFAULT_MODBUS_PORT,
  collectModbusFields,
  createBadBlockStatus,
  normalizePlcName,
  normalizeRegisterValue,
  parseMwAddress,
} = require("./shared");

async function readModbus(driver, plc, options = {}) {
  const plcName = normalizePlcName(plc);
  const dataCapture = plc.dataCapture || driver.dataCapture;
  const socket = new net.Socket();
  const client = new modbusClient.client.TCP(socket);
  const data = [];

  try {
    await connectSocket(driver, socket, plc);

    for (const blockItem of dataCapture) {
      const blockData = await readBlock(driver, client, plc, plcName, blockItem, options);
      data.push(...blockData);
    }
  } finally {
    socket.destroy();
  }

  return data;
}

async function readBlock(driver, client, plc, plcName, blockItem, options) {
  const blockName = Object.keys(blockItem)[0];
  const blockDef = blockItem[blockName];
  const blockMinAddress = parseMwAddress(blockDef._topologicalAddress);
  const badBlockKey = `${plcName}|${blockName}|${blockMinAddress}`;
  const cachedBadBlock = driver.badBlockCache.get(badBlockKey);

  if (cachedBadBlock && cachedBadBlock.retryAt > Date.now()) return [cachedBadBlock.item];

  try {
    const blockData = await readGoodBlock(driver, client, plc, plcName, blockDef, blockName);
    driver.badBlockCache.delete(badBlockKey);
    emitBlockData(options, blockData, plc, plcName, blockName);
    return blockData;
  } catch (error) {
    if (driver.logBlockErrors) {
      console.error(`Error leyendo bloque ${blockName} de ${plcName}:`, error.message);
    }

    const badBlock = createBadBlockStatus(plc, blockName, blockMinAddress, `Error leyendo bloque: ${error.message}`);
    driver.badBlockCache.set(badBlockKey, {
      item: badBlock,
      retryAt: Date.now() + driver.badBlockRetryMs,
    });
    emitBlockData(options, [badBlock], plc, plcName, blockName);
    return [badBlock];
  }
}

async function readGoodBlock(driver, client, plc, plcName, blockDef, blockName) {
  const blockMin = parseMwAddress(blockDef._topologicalAddress);
  const fields = collectModbusFields(blockDef);
  const indexes = fields.map((field) => parseMwAddress(field.mw)).filter((index) => index !== null);

  if (blockMin === null || indexes.length === 0) return [];

  const blockMax = Math.max(blockMin, ...indexes);
  const registers = await readRegisterRange(driver, client, blockMin, blockMax);

  return fields.flatMap((fieldDef) => {
    const mwValue = parseMwAddress(fieldDef.mw);
    if (mwValue === null) return [];

    const normalized = normalizeRegisterValue(
      registers[mwValue - blockMin],
      driver.minDecimal,
      driver.maxDecimal
    );

    return {
      plc: plcName,
      tag: fieldDef.tag,
      value: normalized.value,
      index: mwValue,
      type: fieldDef.type,
      protocol: plc.protocol,
      timestamp: new Date().toISOString(),
      quality: normalized.quality,
    };
  });
}

function emitBlockData(options, blockData, plc, plcName, blockName) {
  if (typeof options.onData !== "function" || blockData.length === 0) return;
  options.onData(blockData, { plc: plcName, blockName, protocol: plc.protocol });
}

async function writeModbus(driver, plc, command) {
  const socket = new net.Socket();
  const client = new modbusClient.client.TCP(socket);
  const index = Number(command.index);
  let newValue = Number(command.value);

  if (!Number.isFinite(index)) throw new Error("El comando no incluye un indice valido.");
  if (!Number.isFinite(newValue)) throw new Error("El comando no incluye un valor numerico valido.");

  try {
    await connectSocket(driver, socket, plc);
    if (newValue > driver.maxDecimal || newValue < driver.minDecimal) newValue = 0;

    const scaledValue = Math.round(newValue * 10);
    const registerValue = scaledValue < 0 ? scaledValue & 0xffff : scaledValue;
    await client.writeSingleRegister(index, registerValue);

    return {
      ...command,
      plc: normalizePlcName(plc),
      protocol: plc.protocol,
      value: newValue,
      status: "success",
      timestamp: new Date().toISOString(),
    };
  } finally {
    socket.destroy();
  }
}

async function connectSocket(driver, socket, plc) {
  const host = plc.host;
  const port = plc.port || DEFAULT_MODBUS_PORT;
  const timeoutMs = plc.timeoutMs || driver.socketTimeoutMs;

  await new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      socket.removeAllListeners("connect");
      socket.removeAllListeners("error");
      socket.removeAllListeners("timeout");
      error ? reject(error) : resolve();
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish());
    socket.once("error", finish);
    socket.once("timeout", () =>
      finish(new Error(`Tiempo de espera agotado conectando a ${host}:${port}`))
    );
    socket.connect({ host, port });
  });
}

async function readRegisterRange(driver, client, blockMin, blockMax) {
  const registers = [];
  for (let start = blockMin; start <= blockMax; start += driver.maxRegistersPerRead) {
    const count = Math.min(driver.maxRegistersPerRead, blockMax - start + 1);
    try {
      const response = await client.readHoldingRegisters(start, count);
      registers.push(...response.response._body.valuesAsArray);
    } catch (error) {
      // Capturar información más detallada del error Modbus
      let errorDetails = error.message;
      if (error.response && error.response._body) {
        const exceptionCode = error.response._body.exceptionCode;
        const exceptionMessage = {
          1: 'Función ilegal',
          2: 'Dirección ilegal',
          3: 'Valor ilegal',
          4: 'Error en dispositivo esclavo',
        }[exceptionCode] || `Excepción ${exceptionCode}`;
        errorDetails = `Excepción Modbus: ${exceptionMessage} (código ${exceptionCode})`;
      }
      throw new Error(`${errorDetails} - Lectura de registros ${start}-${start + count - 1}`);
    }
  }
  return registers;
}

module.exports = { readModbus, writeModbus };
