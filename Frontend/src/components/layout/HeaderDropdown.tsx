import type { ComponentType, SVGProps } from 'react'

export type HeaderIcon = ComponentType<SVGProps<SVGSVGElement>>
export type HeaderMenuName = 'inbox' | 'notifications' | 'profile' | 'team'
export type HeaderMenuItem = {
  danger?: boolean
  icon: HeaderIcon
  label: string
  onClick?: () => void
}

export function HeaderDropdown({
  badge,
  icon: IconComponent,
  items,
  label,
  menu,
  onToggle,
  openMenu,
}: {
  badge?: string
  icon: HeaderIcon
  items: HeaderMenuItem[]
  label: string
  menu: HeaderMenuName
  onToggle: (menu: HeaderMenuName) => void
  openMenu: HeaderMenuName | null
}) {
  return (
    <div className="header-dropdown">
      <button
        aria-expanded={openMenu === menu}
        aria-label={label}
        className={`header-icon-button${badge ? ` with-badge ${badge}` : ''}`}
        onClick={() => onToggle(menu)}
        type="button"
      >
        <IconComponent />
      </button>
      <HeaderMenu items={items} label={label} open={openMenu === menu} />
    </div>
  )
}

export function HeaderMenu({ items, label, open }: { items: HeaderMenuItem[]; label: string; open: boolean }) {
  return (
    <div aria-hidden={!open} className="header-menu" data-open={open}>
      <div className="header-menu-section">
        <span>{label}</span>
        <i aria-hidden="true" />
      </div>
      {items.map(({ danger, icon: IconComponent, label: itemLabel, onClick }) => (
        <button className={danger ? 'danger-option' : undefined} key={itemLabel} onClick={onClick} tabIndex={open ? 0 : -1} type="button">
          <span>{itemLabel}</span>
          <IconComponent />
        </button>
      ))}
    </div>
  )
}
