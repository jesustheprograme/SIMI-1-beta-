const {
  DEFAULT_BAD_BLOCK_RETRY_MS,
  DEFAULT_MAX_DECIMAL,
  DEFAULT_MAX_REGISTERS_PER_READ,
  DEFAULT_MIN_DECIMAL,
  DEFAULT_SOCKET_TIMEOUT_MS,
  createBadStatus,
  normalizePlcName,
} = require("./shared");
const { readModbus, writeModbus } = require("./modbusProtocol");
const { ensureOpcUaSession, readOpcUa, writeOpcUa } = require("./opcUaProtocol");
const { readSiemensS7 } = require("./siemensS7Protocol");
class IndustrialDriver {
  constructor(config, options = {}) {
    const plcs = Array.isArray(config) ? config : config.plcs || [];

    this.plcs = plcs.filter((plc) => plc.enabled !== false);
    this.dataCapture = options.dataCapture || [];
    this.maxDecimal = options.maxDecimal || DEFAULT_MAX_DECIMAL;
    this.minDecimal = options.minDecimal || DEFAULT_MIN_DECIMAL;
    this.maxRegistersPerRead = options.maxRegistersPerRead || DEFAULT_MAX_REGISTERS_PER_READ;
    this.socketTimeoutMs = options.socketTimeoutMs || DEFAULT_SOCKET_TIMEOUT_MS;
    this.badBlockRetryMs = options.badBlockRetryMs || DEFAULT_BAD_BLOCK_RETRY_MS;
    this.logBlockErrors = options.logBlockErrors !== false;
    this.logConnectionErrors = options.logConnectionErrors !== false;
    this.badBlockCache = new Map();
    this.opcuaClients = new Map();
    this.opcuaSessions = new Map();
    this.siemensConnections = new Map();
  }

  async connect() {
    const opcuaPlcs = this.plcs.filter((plc) => this.isOpcUaProtocol(plc.protocol));
    for (const plc of opcuaPlcs) {
      try {
        await ensureOpcUaSession(this, plc);
      } catch (error) {
        console.error(`No se pudo conectar por OPC UA a ${normalizePlcName(plc)}:`, error.message);
      }
    }
  }

  async read(options = {}) {
    const data = [];
    const plcs = options.protocol
      ? this.plcs.filter((plc) => plc.protocol === options.protocol)
      : this.plcs;

    for (const plc of plcs) {
      try {
        data.push(...(await this.readPlc(plc, options)));
      } catch (error) {
        if (this.logConnectionErrors) {
          console.error(`Error leyendo ${normalizePlcName(plc)}:`, error.message);
        }
        data.push(createBadStatus(plc, `Error leyendo ${normalizePlcName(plc)}: ${error.message}`));
      }
    }

    return data;
  }

  async readPlc(plc, options) {
    if (plc.protocol === "modbus-tcp") return readModbus(this, plc, options);
    if (plc.protocol === "siemens-s7") return readSiemensS7(this, plc, options);
    if (this.isOpcUaProtocol(plc.protocol)) return readOpcUa(this, plc);
    return [createBadStatus(plc, `Protocolo no soportado: ${plc.protocol}`)];
  }

  async write(command) {
    const requestedPlcName = command.plc || command.plcName || command.name;
    const plc = this.findPlc(requestedPlcName);

    if (!plc) {
      return { ...command, status: "error", message: `PLC "${requestedPlcName}" no encontrado.` };
    }

    try {
      if (plc.protocol === "modbus-tcp") return await writeModbus(this, plc, command);
      if (plc.protocol === "siemens-s7") {
        return {
          ...command,
          plc: normalizePlcName(plc),
          protocol: plc.protocol,
          status: "error",
          message: "Siemens S7 esta configurado solo para lectura.",
        };
      }
      if (this.isOpcUaProtocol(plc.protocol)) return await writeOpcUa(this, plc, command);

      return {
        ...command,
        plc: normalizePlcName(plc),
        protocol: plc.protocol,
        status: "error",
        message: `Protocolo no soportado: ${plc.protocol}`,
      };
    } catch (error) {
      console.error(`Error escribiendo en ${normalizePlcName(plc)}:`, error.message);
      return {
        ...command,
        plc: normalizePlcName(plc),
        protocol: plc.protocol,
        status: "error",
        message: error.message,
      };
    }
  }

  async disconnect() {
    for (const session of this.opcuaSessions.values()) {
      try {
        await session.close();
      } catch (error) {
        console.error("Error cerrando sesion OPC UA:", error.message);
      }
    }

    for (const client of this.opcuaClients.values()) {
      try {
        await client.disconnect();
      } catch (error) {
        console.error("Error desconectando cliente OPC UA:", error.message);
      }
    }

    this.opcuaSessions.clear();
    this.opcuaClients.clear();

    for (const connection of this.siemensConnections.values()) {
      try {
        connection.dropConnection?.();
      } catch (error) {
        console.error("Error cerrando conexion Siemens S7:", error.message);
      }
    }

    this.siemensConnections.clear();
  }

  findPlc(plcName) {
    return this.plcs.find((plc) => normalizePlcName(plc) === plcName);
  }

  isOpcUaProtocol(protocol) {
    return protocol === "codesys-opcua" || protocol === "profinet-opcua-gateway";
  }
}

module.exports = IndustrialDriver;
