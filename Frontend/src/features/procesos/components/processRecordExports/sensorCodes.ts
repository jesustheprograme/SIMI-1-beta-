type SensorCodeSource = {
  id?: string
  name?: string
  sensor?: string
  sensorTitle?: string
  variable?: string
}

const SENSOR_PREFIXES: Array<[RegExp, string]> = [
  [/\b(?:tmp|temp|tem|temperatura)\b/i, 'TEMP'],
  [/\b(?:hum|humedad)\b/i, 'HUM'],
  [/\bco2\b/i, 'CO2'],
  [/\b(?:etn|eti|etileno)\b/i, 'ETN'],
]

// Genera el codigo corto visible en PDF/Excel sin depender del texto largo del sensor.
export function getShortSensorCode(source: SensorCodeSource) {
  const values = getSourceValues(source)
  const prefixedValue = values.map(parsePrefixedSensorCode).find(Boolean)

  if (prefixedValue) return prefixedValue

  const prefix = values.map(getSensorPrefix).find(Boolean)
  const number = values.map(getTrailingSensorNumber).find(Boolean)

  return prefix && number ? `${prefix}-${number}` : ''
}

export function getSensorMatchKeys(source: SensorCodeSource) {
  const values = getSourceValues(source)
  const shortCode = getShortSensorCode(source)
  const keys = values.flatMap((value) => [value, getLastIdSegment(value)])

  if (shortCode) keys.push(shortCode, shortCode.replace('TEMP-', 'TMP-'))

  return Array.from(new Set(keys.map(normalizeSensorKey).filter(Boolean)))
}

export function normalizeSensorKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function getSourceValues(source: SensorCodeSource) {
  return [source.id, source.name, source.variable, source.sensor, source.sensorTitle]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
}

function parsePrefixedSensorCode(value: string) {
  const text = getLastIdSegment(value)
  const match = text.match(/\b(tmp|temp|tem|hum|co2|etn|eti|temperatura|humedad|etileno)[\s-]*(\d{1,})\b/i)

  if (!match) return ''

  const prefix = getSensorPrefix(match[1])
  return prefix ? `${prefix}-${formatSensorNumber(match[2])}` : ''
}

function getSensorPrefix(value: string) {
  const match = SENSOR_PREFIXES.find(([pattern]) => pattern.test(value))
  return match?.[1] ?? ''
}

function getTrailingSensorNumber(value: string) {
  const match = value.match(/(\d{1,})\s*$/)
  return match ? formatSensorNumber(match[1]) : ''
}

function formatSensorNumber(value: string) {
  return value.padStart(3, '0')
}

function getLastIdSegment(value: string) {
  return value.split('::').at(-1)?.trim() ?? value.trim()
}
