import type { ComboboxOption } from '../../../components/ui/Combobox'

export const sensorGroupOptions: ComboboxOption[] = [
  {
    value: 'zona-produccion',
    label: 'Zona de produccion',
    description: 'Sensores principales de la linea operativa',
  },
  {
    value: 'camara-fria',
    label: 'Camara fria',
    description: 'Monitoreo ambiental de temperatura y humedad',
  },
  {
    value: 'almacen',
    label: 'Almacen',
    description: 'Lecturas agrupadas para area de inventario',
  },
  {
    value: 'laboratorio',
    label: 'Laboratorio',
    description: 'Variables de control para pruebas internas',
  },
]
