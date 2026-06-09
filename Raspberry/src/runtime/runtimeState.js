function createRuntimeState() {
  return {
    running: false,
    lastReadAt: null,
    lastSnapshotAt: null,
    lastDurationMs: null,
    lastData: [],
    lastError: null,
    mqtt: {
      enabled: false,
      connected: false,
      error: null,
      url: null,
    },
  };
}

module.exports = createRuntimeState;
