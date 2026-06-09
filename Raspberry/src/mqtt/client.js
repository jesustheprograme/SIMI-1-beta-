const mqtt = require("mqtt");

function createMqttClient({ config, runtime, handleMessage }) {
  const subscribeOptions = { qos: 1 };
  let client = null;

  function start() {
    if (!config.mqtt.enabled) {
      runtime.updateMqttState({ enabled: false, connected: false, source: "mqtt-disabled" });
      return null;
    }

    client = mqtt.connect(config.mqtt.url, {
      connectTimeout: 5000,
      clientId: config.mqtt.clientId,
      keepalive: 60,
      clean: true,
      reconnectPeriod: config.mqtt.reconnectMs,
      will: buildRetainedWill(),
    });

    bindEvents();
    return client;
  }

  function bindEvents() {
    client.on("connect", handleConnect);
    client.on("reconnect", () => runtime.updateMqttState({ connected: false, source: "mqtt-reconnect" }));
    client.on("close", () => runtime.updateMqttState({ connected: false, source: "mqtt-close" }));
    client.on("error", (error) =>
      runtime.updateMqttState({ connected: false, error: error.message, source: "mqtt-error" })
    );
    client.on("message", handleMessage);
  }

  function handleConnect() {
    console.log("Cliente MQTT conectado.");
    client.subscribe(
      [
        config.topics.readRequest,
        config.topics.writeRequest,
        config.topics.plcData,
        config.topics.plcChanges,
        config.topics.plcStatus,
        config.topics.writeConfirm,
      ],
      subscribeOptions
    );
    runtime.updateMqttState({
      enabled: true,
      connected: true,
      error: null,
      url: config.mqtt.url,
      source: "mqtt-connect",
    });
    publishRetainedOnlineStatus();
    runtime.publishPlcData().catch((error) => {
      console.error("No se pudo publicar snapshot post-reconexion MQTT:", error.message);
    });
  }

  function buildRetainedWill() {
    const payload = runtime.buildAvailabilityStatus("MQTT_LWT_OFFLINE", {
      source: "mqtt-lwt",
      errorCode: "MQTT_LWT_OFFLINE",
      errorMessage: "El backend se desconecto sin cerrar MQTT correctamente.",
      lwt: true,
      retained: true,
    });

    return {
      topic: config.topics.plcStatus,
      payload: JSON.stringify(payload),
      qos: 1,
      retain: true,
    };
  }

  function publishRetainedOnlineStatus() {
    const payload = runtime.buildAvailabilityStatus("MQTT_ONLINE", {
      source: "mqtt-connect",
      errorCode: null,
      errorMessage: null,
      lwt: false,
      retained: true,
    });

    client.publish(config.topics.plcStatus, JSON.stringify(payload), { qos: 1, retain: true });
  }

  function stop() {
    if (client) client.end(true);
  }

  return {
    getClient: () => client,
    start,
    stop,
  };
}

module.exports = createMqttClient;
