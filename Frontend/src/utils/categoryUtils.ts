export function getInferredCategories(sensorTitle: string) {
  if (sensorTitle.toLowerCase().includes('temperatura')) return ['Temperatura']
  if (sensorTitle.toLowerCase().includes('humedad')) return ['Humedad']
  if (sensorTitle.toLowerCase().includes('co2')) return ['CO2']
  if (sensorTitle.toLowerCase().includes('etileno')) return ['Etileno']
  return [sensorTitle.replace(/^Sensores\s+/i, '')]
}
