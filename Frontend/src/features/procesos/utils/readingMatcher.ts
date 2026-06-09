import type { ProcessSensorReading } from '../types'

export type ReadingMatchTarget = {
  id: string
  name: string
  sensorTitle?: string
}

// Empata columnas historicas con lecturas reales aunque usen ID fisico o nombres legacy.
export function findMatchingReading(readings: ProcessSensorReading[], target: ReadingMatchTarget) {
  const targetKeys = getReadingMatchKeys(target)

  return readings.find((reading) => {
    const readingKeys = getReadingMatchKeys(reading)
    return targetKeys.some((key) => readingKeys.includes(key))
  })
}

export function getReadingSensorId(value: string) {
  return (value.split('::').at(-1) ?? value).trim()
}

function getReadingMatchKeys(target: ReadingMatchTarget) {
  const values = [target.id, target.name, target.sensorTitle].map((value) => String(value ?? '').trim())
  const sensorCode = getSensorCode(target)
  const keys = values.flatMap((value) => [value, getReadingSensorId(value)])

  if (sensorCode) keys.push(sensorCode, sensorCode.replace('TEMP-', 'TMP-'))

  return Array.from(new Set(keys.map(normalizeMatchValue).filter(Boolean)))
}

function getSensorCode(target: ReadingMatchTarget) {
  const values = [target.id, target.name, target.sensorTitle].map((value) => String(value ?? '').trim())
  const prefixed = values.map(parsePrefixedCode).find(Boolean)
  if (prefixed) return prefixed

  const prefix = values.map(getSensorPrefix).find(Boolean)
  const number = values.map(getTrailingNumber).find(Boolean)
  return prefix && number ? `${prefix}-${number}` : ''
}

function parsePrefixedCode(value: string) {
  const text = getReadingSensorId(value)
  const match = text.match(/\b(tmp|temp|tem|hum|co2|etn|eti|temperatura|humedad|etileno)[\s-]*(\d+)\b/i)

  if (!match) return ''

  const prefix = getSensorPrefix(match[1])
  return prefix ? `${prefix}-${match[2].padStart(3, '0')}` : ''
}

function getSensorPrefix(value: string) {
  const normalized = normalizeMatchValue(value)
  if (/(tmp|temp|tem|temperatura)/.test(normalized)) return 'TEMP'
  if (/(hum|humedad)/.test(normalized)) return 'HUM'
  if (/co2/.test(normalized)) return 'CO2'
  if (/(etn|eti|etileno)/.test(normalized)) return 'ETN'
  return ''
}

function getTrailingNumber(value: string) {
  const match = value.match(/(\d+)\s*$/)
  return match ? match[1].padStart(3, '0') : ''
}

function normalizeMatchValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}
