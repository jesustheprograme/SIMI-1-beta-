function createPublishQueue({ config, getClient, runtime, publishOptions }) {
  let publishQueue = [];
  let publishTimer = null;

  function publishNow(topic, payload) {
    const client = getClient();
    if (!client || !runtime.state.mqtt.connected) return;
    client.publish(topic, JSON.stringify(payload), publishOptions[topic] || { qos: 0, retain: false });
  }

  function flushPublishQueue() {
    if (publishQueue.length === 0) {
      clearInterval(publishTimer);
      publishTimer = null;
      return;
    }

    const next = publishQueue.shift();
    publishNow(next.topic, next.payload);
  }

  function publish(topic, payload) {
    const maxRate = Math.max(1, config.mqtt.maxMessagesPerSecond || 10);
    const intervalMs = Math.ceil(1000 / maxRate);

    publishQueue.push({ topic, payload });

    if (publishQueue.length === 1) {
      flushPublishQueue();
      return;
    }

    if (!publishTimer) {
      flushPublishQueue();
      publishTimer = setInterval(flushPublishQueue, intervalMs);
    }
  }

  function stop() {
    if (publishTimer) clearInterval(publishTimer);
  }

  return { publish, stop };
}

module.exports = createPublishQueue;
