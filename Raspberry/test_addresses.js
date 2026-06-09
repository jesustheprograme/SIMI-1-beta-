const { loadJson, loadDataCapture } = require("./src/loadProjectData");
const path = require("path");

const plcConfigPath = path.join(__dirname, "config", "plcs.json");
const variablesPath = path.join(__dirname, "variables.json");

console.log("Cargando configuración...");
try {
  const dataCapture = loadDataCapture(variablesPath);
  
  console.log(`\nTotal de bloques: ${dataCapture.length}`);
  console.log("\nPrimeros 5 bloques:");
  
  for (let i = 0; i < Math.min(5, dataCapture.length); i++) {
    const blockItem = dataCapture[i];
    const blockName = Object.keys(blockItem)[0];
    const blockDef = blockItem[blockName];
    const topologicalAddress = blockDef._topologicalAddress;
    
    console.log(`\n  Bloque ${i + 1}: ${blockName}`);
    console.log(`    - Dirección topológica: ${topologicalAddress}`);
    console.log(`    - Parsed MW: ${parseInt(String(topologicalAddress).toUpperCase().replace("%MW", ""), 10)}`);
  }
  
} catch (error) {
  console.error("Error:", error.message);
  console.error(error.stack);
}
