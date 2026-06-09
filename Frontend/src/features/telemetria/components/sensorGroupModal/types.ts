import type { ReactElement, SVGProps } from 'react'

export type Category = 'Temperatura' | 'Humedad' | 'CO2' | 'Etileno'
export type Filter = Category | 'Todas'

export type Variable = {
  category: Category
  code: string
  id: string
  name: string
  unit: string
  value: string
}

export type CategoryConfig = {
  icon: (props: SVGProps<SVGSVGElement>) => ReactElement
  key: Category
  tint: string
}
