


const fs = require("fs");
const { cleanData, buildDataCapture } = require("../Controller/prueba_test");

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadDataCapture(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const processedData = cleanData(fileBuffer);

  return buildDataCapture(processedData.variables);
}

module.exports = {
  loadJson,
  loadDataCapture,
};
