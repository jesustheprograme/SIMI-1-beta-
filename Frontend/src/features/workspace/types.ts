import type { ReactElement, SVGProps } from 'react'

export type IconComponent = (props: SVGProps<SVGSVGElement>) => ReactElement

export type NavItem = {
  icon: IconComponent
  children?: Omit<NavItem, 'icon' | 'children'>[]
  title: string
  to: string
}
