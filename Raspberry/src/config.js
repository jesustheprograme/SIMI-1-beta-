const path = require("path");

require("dotenv").config();

const rootPath = path.join(__dirname, "..");

// Topics publicos del sistema. Mantenerlos centralizados evita diferencias
// entre MQTT Explorer, backend y documentacion.
const topics = {
  // Entrada MQTT para pedir una lectura/snapshot manual del PLC.
  readRequest: "consulte/topic",
  // Entrada MQTT para pedir escritura de un registro/tag del PLC.
  writeRequest: "consulte/write",
  // Snapshot completo: se publica retenido para clientes nuevos/reconectados.
  plcData: "topic_plc_data",
  // Deltas: solo cambios detectados; configurable por ENV si otro sistema usa otro topic.
  plcChanges: process.env.MQTT_TOPIC_CHANGES || "topic_plc_changes",
  // Salud operacional del backend/PLC: ONLINE, DEGRADED, READ_TIMEOUT, etc.
  plcStatus: process.env.MQTT_TOPIC_STATUS || "topic_plc_status",
  // Topic heredado para confirmar escrituras; se conserva por compatibilidad.
  writeConfirm: "topic/registerCalibration/data",
};

module.exports = {
  // Puerto HTTP donde se sirve el panel web y la API.
  appPort: Number(process.env.PORT || 3000),
  // Carpeta estatica del panel.
  publicPath: path.join(rootPath, "public"),
  // Configuracion de PLCs activos/desactivados.
  plcConfigPath: process.env.PLC_CONFIG_PATH || path.join(rootPath, "config", "plcs.json"),
  // Export de variables EcoStruxure que se convierte a tags.
  variablesPath: process.env.VARIABLES_PATH || path.join(rootPath, "variables.json"),
  mqtt: {
    // Permite ejecutar solo API/WebSocket sin broker MQTT.
    enabled: process.env.MQTT_ENABLED !== "false",
    // Endpoint WebSocket del broker EMQX/MQTT.
    url: process.env.MQTT_URL || "ws://127.0.0.1:8083/mqtt",
    // ID unico del cliente MQTT backend.
    clientId: process.env.MQTT_CLIENT_ID || `camposol_${Date.now()}`,
    // Tiempo entre intentos de reconexion al broker.
    reconnectMs: Number(process.env.MQTT_RECONNECT_MS || 10000),
    // Protege broker/web si muchos tags cambian al mismo tiempo.
    maxMessagesPerSecond: Number(process.env.MAX_MQTT_MESSAGES_PER_SECOND || 10),
  },
  plc: {
    // Lectura rapida para monitoreo; no implica control deterministico del PLC.
    pollIntervalMs: Number(process.env.PLC_POLL_INTERVAL_MS || 250),
    socketTimeoutMs: Number(process.env.PLC_SOCKET_TIMEOUT_MS || 1500),
    badBlockRetryMs: Number(process.env.BAD_BLOCK_RETRY_MS || 60000),
    // Snapshot retenido: sincroniza clientes nuevos o reconectados.
    snapshotIntervalMs: Number(process.env.SNAPSHOT_INTERVAL_MS || 60000),
    // Hysteresis simple para no publicar ruido analogico menor a 1 decimal.
    changeTolerance: Number(process.env.CHANGE_TOLERANCE || 0.1),
  },
  topics,
};
