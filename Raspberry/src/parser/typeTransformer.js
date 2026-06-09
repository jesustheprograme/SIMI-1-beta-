function transformType(typeKey, dataSource, cache = {}) {
  if (cache[typeKey]) return cache[typeKey];

  const def = dataSource[typeKey];
  if (!def || !def.structure || !def.structure.variables) return typeKey;

  const result = {};
  const variables = Array.isArray(def.structure.variables)
    ? def.structure.variables
    : [def.structure.variables];

  variables.forEach((variable) => {
    const name = variable._name;
    const type = variable._typeName;
    result[name] = dataSource[type] ? transformType(type, dataSource, cache) : type;
  });

  cache[typeKey] = result;
  return result;
}

function transformDataSource(dataSource) {
  return Object.keys(dataSource).reduce((transformed, key) => {
    transformed[key] = transformType(key, dataSource);
    return transformed;
  }, {});
}

function buildOriginalDataSource(DDTSource) {
  if (!Array.isArray(DDTSource)) return null;

  return DDTSource.reduce((source, item) => {
    source[item._DDTName] = { structure: item.structure };
    return source;
  }, {});
}

module.exports = {
  buildOriginalDataSource,
  transformDataSource,
};
