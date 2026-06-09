function createMqttMessageHandler({ config, io, runtime }) {
  return async function handleMessage(topic, message) {
    try {
      if (topic === config.topics.readRequest) {
        await runtime.publishPlcData();
        return;
      }

      if (topic === config.topics.writeRequest) {
        await runtime.writePlc(JSON.parse(message.toString()));
        return;
      }

      if (topic === config.topics.plcData) {
        const payload = JSON.parse(message.toString());
        const data = Array.isArray(payload) ? payload : payload.data;
        runtime.applyIncomingData(data, "mqtt-plc-data");
        return;
      }

      if (topic === config.topics.plcChanges) {
        const payload = JSON.parse(message.toString());
        if (runtime.shouldApplyMessage(payload)) io.emit("plc:changes", payload);
        return;
      }

      if (topic === config.topics.plcStatus) {
        io.emit("plc:status", JSON.parse(message.toString()));
        return;
      }

      if (topic === config.topics.writeConfirm) {
        io.emit("write:update", JSON.parse(message.toString()));
      }
    } catch (error) {
      console.error(`Error procesando MQTT '${topic}':`, error.message);
    }
  };
}

module.exports = createMqttMessageHandler;
