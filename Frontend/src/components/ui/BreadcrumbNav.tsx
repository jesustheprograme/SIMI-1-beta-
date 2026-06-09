import { ChevronRightIcon } from '../../features/workspace/icons'

export function BreadcrumbNav({ items }: { items: string[] }) {
  return (
    <nav className="breadcrumb-nav" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span className={index === items.length - 1 ? 'is-current' : undefined} key={`${item}-${index}`}>
          {item}
          {index < items.length - 1 && <ChevronRightIcon />}
        </span>
      ))}
    </nav>
  )
}
