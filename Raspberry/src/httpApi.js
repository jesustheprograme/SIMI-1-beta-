const express = require("express");

function registerHttpApi(app, runtime) {
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/status", (req, res) => {
    res.json(runtime.buildStatusPayload());
  });

  app.post("/api/read", async (req, res) => {
    try {
      const data = await runtime.readPlcData();
      res.json({
        ...runtime.buildStatusPayload(0),
        data,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/read/siemens-s7", async (req, res) => {
    try {
      res.json(await runtime.readProtocolData("siemens-s7"));
    } catch (error) {
      res.status(500).json({
        protocol: "siemens-s7",
        data: [],
        message: error.message,
        quality: "BAD",
        status: "PLC_READ_ERROR",
      });
    }
  });

  app.post("/api/write", async (req, res) => {
    try {
      const result = await runtime.writePlc(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
}

module.exports = registerHttpApi;
