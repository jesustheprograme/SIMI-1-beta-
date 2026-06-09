const multer = require("multer");
const { buildDataCapture, cleanData, getData } = require("../src/parser/variablesParser");

const upload = multer({ storage: multer.memoryStorage() });

module.exports = {
  buildDataCapture,
  cleanData,
  getData,
  upload,
};
