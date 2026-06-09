function createMessageFactory() {
  let sequence = 0;
  const sessionId = `plc-runtime-${Date.now()}`;

  function nextSeq() {
    sequence += 1;
    return sequence;
  }

  function buildMessage(messageType, source, body) {
    return {
      messageType,
      sessionId,
      seq: nextSeq(),
      publishedAt: new Date().toISOString(),
      source,
      ...body,
    };
  }

  return { buildMessage, sessionId };
}

function createDeduplicator() {
  let lastAppliedSeq = 0;
  let lastAppliedSessionId = null;

  return function shouldApplyMessage(payload) {
    if (!payload || typeof payload.seq !== "number") return true;

    if (payload.sessionId && payload.sessionId !== lastAppliedSessionId) {
      lastAppliedSessionId = payload.sessionId;
      lastAppliedSeq = 0;
    }

    if (payload.seq <= lastAppliedSeq) return false;

    lastAppliedSeq = payload.seq;
    return true;
  };
}

module.exports = { createDeduplicator, createMessageFactory };
