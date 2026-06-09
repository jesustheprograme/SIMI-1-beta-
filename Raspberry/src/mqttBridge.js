const createMqttClient = require("./mqtt/client");
const createMqttMessageHandler = require("./mqtt/messageHandler");
const createPublishQueue = require("./mqtt/publishQueue");

function createMqttBridge({ config, io, runtime }) {
  const publishOptions = {
    [config.topics.plcChanges]: { qos: 0, retain: false },
    [config.topics.plcData]: { qos: 1, retain: true },
    [config.topics.plcStatus]: { qos: 1, retain: true },
    [config.topics.readRequest]: { qos: 1, retain: false },
    [config.topics.writeRequest]: { qos: 1, retain: false },
    [config.topics.writeConfirm]: { qos: 1, retain: false },
  };

  const handleMessage = createMqttMessageHandler({ config, io, runtime });
  const mqttClient = createMqttClient({ config, runtime, handleMessage });
  const publishQueue = createPublishQueue({
    config,
    runtime,
    publishOptions,
    getClient: mqttClient.getClient,
  });

  const publisher = {
    publishSnapshot: (data) => publishQueue.publish(config.topics.plcData, data),
    publishChanges: (payload) => publishQueue.publish(config.topics.plcChanges, payload),
    publishStatus: (payload) => publishQueue.publish(config.topics.plcStatus, payload),
    publishWriteConfirm: (result) => publishQueue.publish(config.topics.writeConfirm, result),
  };

  function stop() {
    publishQueue.stop();
    mqttClient.stop();
  }

  return {
    start: mqttClient.start,
    stop,
    publisher,
  };
}

module.exports = createMqttBridge;
