import type { ReactNode } from 'react'

type IconBoxProps = {
  children: ReactNode
  variant?: 'alert' | 'data' | 'task'
  size?: 'sm' | 'md' | 'lg'
}

const variantStyles = {
  alert: 'bg-red-100 text-red-600',
  data: 'bg-blue-100 text-blue-600',
  task: 'bg-green-100 text-green-600',
}

const sizeStyles = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
}

export function IconBox({ children, variant = 'alert', size = 'md' }: IconBoxProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg shrink-0 ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {children}
    </span>
  )
}
