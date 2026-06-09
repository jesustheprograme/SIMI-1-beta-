function addTagToDefinition(obj, prefix) {
  return Object.keys(obj).reduce((result, group) => {
    const groupObj = obj[group];
    result[group] = tagGroup(groupObj, `${prefix}.${group}`);
    return result;
  }, {});
}

function tagGroup(groupObj, tagPrefix) {
  if (typeof groupObj === "string") return { type: groupObj, tag: tagPrefix };
  if (isFieldObject(groupObj)) return { ...groupObj, tag: tagPrefix };

  return Object.keys(groupObj).reduce((newGroup, field) => {
    const fieldDef = groupObj[field];
    newGroup[field] =
      typeof fieldDef === "string"
        ? { type: fieldDef, tag: `${tagPrefix}.${field}` }
        : { ...fieldDef, tag: `${tagPrefix}.${field}` };
    return newGroup;
  }, {});
}

function isFieldObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.prototype.hasOwnProperty.call(value, "type") &&
    Object.prototype.hasOwnProperty.call(value, "mw")
  );
}

function buildDataCapture(variablesObj) {
  return Object.keys(variablesObj).map((blockName) => {
    const block = variablesObj[blockName];
    const defKeys = Object.keys(block).filter((key) => key !== "_topologicalAddress");
    if (defKeys.length === 0) return { [blockName]: { ...block } };

    const blockData = {};
    if (block._topologicalAddress) blockData._topologicalAddress = block._topologicalAddress;
    defKeys.forEach((section) => {
      blockData[section] = addTagToDefinition(block[section], blockName);
    });

    return { [blockName]: blockData };
  });
}

module.exports = { buildDataCapture };
