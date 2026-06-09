import { DropletsIcon, SparklesIcon, ThermometerIcon, WindIcon } from './icons'
import type { CategoryConfig } from './types'

export const categories: CategoryConfig[] = [
  { key: 'Temperatura', icon: ThermometerIcon, tint: 'is-temperature' },
  { key: 'Humedad', icon: DropletsIcon, tint: 'is-humidity' },
  { key: 'CO2', icon: WindIcon, tint: 'is-co2' },
  { key: 'Etileno', icon: SparklesIcon, tint: 'is-etileno' },
]
