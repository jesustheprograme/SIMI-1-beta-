function assignMWToNestedStructure(nestedStructure, start) {
  let counter = start;

  if (isLeafStructure(nestedStructure)) {
    return assignLeafFields(nestedStructure, counter);
  }

  const newStructure = {};
  Object.keys(nestedStructure).forEach((group) => {
    const groupObj = nestedStructure[group];

    if (typeof groupObj !== "object" || groupObj === null) {
      const assigned = assignScalar(groupObj, counter);
      newStructure[group] = assigned.value;
      counter = assigned.counter;
      return;
    }

    const assigned = assignLeafFields(groupObj, counter);
    newStructure[group] = assigned.newStructure;
    counter = assigned.counter;
  });

  return { newStructure, counter };
}

function isLeafStructure(value) {
  return Object.values(value).every((field) => typeof field === "string");
}

function assignLeafFields(fields, start) {
  let counter = start;
  const newStructure = {};

  Object.keys(fields).forEach((field) => {
    newStructure[field] = { type: fields[field], mw: `%MW${counter}` };
    counter += 1;
  });

  return { newStructure, counter };
}

function assignScalar(value, counter) {
  if (value !== "INT") return { value, counter };
  return { value: { type: "INT", mw: `%MW${counter}` }, counter: counter + 1 };
}

module.exports = { assignMWToNestedStructure };
