const { assignMWToNestedStructure } = require("./mwAssigner");
const { buildDataCapture } = require("./tagBuilder");
const { buildOriginalDataSource, transformDataSource } = require("./typeTransformer");

let allValues = {};

function cleanData(fileBuffer) {
  const parsedData = JSON.parse(fileBuffer.toString("utf8"));
  const exchangeFile = parsedData.VariablesExchangeFile;
  validateExchangeFile(exchangeFile);

  const { dataBlock, DDTSource } = exchangeFile;
  const cleanedArray = dataBlock.variables.map(({ instanceElementDesc, attribute, ...rest }) => rest);
  const originalDataSource = buildOriginalDataSource(DDTSource);
  const transformedDataSource = originalDataSource ? transformDataSource(originalDataSource) : null;

  allValues = buildVariablesObject(cleanedArray, transformedDataSource);
  assignAddresses(allValues);

  return { variables: allValues, DataSource: transformedDataSource || null };
}

function validateExchangeFile(exchangeFile) {
  if (!exchangeFile) throw new Error('No se encontro "VariablesExchangeFile" en el JSON.');
  if (!exchangeFile.dataBlock || !Array.isArray(exchangeFile.dataBlock.variables)) {
    throw new Error('Estructura invalida: se esperaba "dataBlock.variables" como arreglo.');
  }
}

function buildVariablesObject(cleanedArray, transformedDataSource) {
  return cleanedArray.reduce((variablesObject, variable) => {
    const name = variable._name;
    const type = variable._typeName;
    variablesObject[name] = {
      [type]: transformedDataSource && transformedDataSource[type] ? transformedDataSource[type] : type,
      _topologicalAddress: variable._topologicalAddress,
    };
    return variablesObject;
  }, {});
}

function assignAddresses(variablesObject) {
  Object.keys(variablesObject).forEach((varName) => {
    const variableObj = variablesObject[varName];
    const startNum = parseInt(String(variableObj._topologicalAddress).replace("%MW", ""), 10) || 0;
    const typeKey = Object.keys(variableObj).find((key) => key !== "_topologicalAddress");
    const definition = typeKey && variableObj[typeKey];

    if (definition && typeof definition === "object") {
      variableObj[typeKey] = assignMWToNestedStructure(definition, startNum).newStructure;
    }
  });
}

function getData(query) {
  const result = allValues[String(query).toUpperCase()];
  if (!result) throw new Error("No encontrado");
  return result;
}

module.exports = {
  buildDataCapture,
  cleanData,
  getData,
};
