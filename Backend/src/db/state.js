const state = {
  db: null,
  usersCollection: null,
  actionsCollection: null,
  outliersCollection: null,
  groupsCollection: null,
  legacyProcessesCollection: null,
  almacenadoProcessesCollection: null,
  maduracionProcessesCollection: null,
  proceso3ProcessesCollection: null,
  sensorLogsCollection: null,
  workspaceConfigCollection: null,
};

function setCollections(nextState) {
  Object.assign(state, nextState);
}

function getCollections() {
  return state;
}

module.exports = { getCollections, setCollections };
