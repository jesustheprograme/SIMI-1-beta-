const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");

const config = require("./src/config");
const IndustrialDriver = require("./Controller/industrialDriver");
const { loadJson, loadDataCapture } = require("./src/loadProjectData");
const createPlcRuntime = require("./src/plcRuntime");
const createMqttBridge = require("./src/mqttBridge");
const registerHttpApi = require("./src/httpApi");

const app = express();
const httpServer = http.createServer(app);
const allowedOrigins = [
  `http://localhost:${config.appPort}`,
  `http://127.0.0.1:${config.appPort}`,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5175",
];
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

const plcConfig = loadJson(config.plcConfigPath);
const dataCapture = loadDataCapture(config.variablesPath);

const driver = new IndustrialDriver(plcConfig, {
  dataCapture,
  logBlockErrors: true,
  logConnectionErrors: true,
  socketTimeoutMs: config.plc.socketTimeoutMs,
  badBlockRetryMs: config.plc.badBlockRetryMs,
});

const mqttPublisher = {
  publishSnapshot: () => {},
  publishChanges: () => {},
  publishStatus: () => {},
  publishWriteConfirm: () => {},
};

const runtime = createPlcRuntime({
  config,
  driver,
  io,
  mqttPublisher,
});

const mqttBridge = createMqttBridge({
  config,
  io,
  runtime,
});

Object.assign(mqttPublisher, mqttBridge.publisher);

app.use(cors({ origin: allowedOrigins }));
app.use((req, res, next) => {
  if (req.path === "/" || req.path.endsWith(".html") || req.path.endsWith(".css") || req.path.endsWith(".js")) {
    res.setHeader("Cache-Control", "no-store");
  }

  next();
});
app.use(express.static(config.publicPath));
registerHttpApi(app, runtime);

io.on("connection", (socket) => {
  runtime.emitSocketSnapshot(socket);
});

let pollTimer = null;
let snapshotTimer = null;

function startPolling() {
  const interval = config.plc.pollIntervalMs;
  if (!interval || interval < 250) return;

  pollTimer = setInterval(() => {
    runtime.readPlcData().catch((error) => {
      console.error("No se pudo actualizar datos por polling:", error.message);
    });
  }, interval);
}

function startSnapshotPublishing() {
  const interval = config.plc.snapshotIntervalMs;
  if (!interval || interval < 1000) return;

  snapshotTimer = setInterval(() => {
    runtime.publishCurrentSnapshot("snapshot-interval");
  }, interval);
}

async function startApp() {
  console.log(`Panel web disponible en http://localhost:${config.appPort}`);

  await driver.connect();
  mqttBridge.start();
  startPolling();
  startSnapshotPublishing();

  runtime.readPlcData().catch((error) => {
    console.error("No se pudo ejecutar la lectura inicial:", error.message);
  });
}

const server = httpServer.listen(config.appPort, startApp);

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `El puerto ${config.appPort} ya esta en uso. Cierra el otro servidor o inicia con PORT=3001 npm run dev.`
    );
    process.exit(1);
  }

  console.error("No se pudo iniciar el servidor web:", error.message);
  process.exit(1);
});

process.on("SIGINT", async () => {
  if (pollTimer) clearInterval(pollTimer);
  if (snapshotTimer) clearInterval(snapshotTimer);
  mqttBridge.stop();
  await driver.disconnect();
  server.close(() => process.exit(0));
});
