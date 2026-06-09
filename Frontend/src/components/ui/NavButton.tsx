import { useState } from 'react'
import type { NavItem } from '../../features/workspace/types'

export function NavButton({
  collapsed,
  item,
  onNavigate,
  pathname,
}: {
  collapsed: boolean
  item: NavItem
  onNavigate: (path: string) => void
  pathname: string
}) {
  const Icon = item.icon
  const exactActive = pathname === item.to
  const active = exactActive || pathname.startsWith(`${item.to}/`)
  const hasChildren = Boolean(item.children?.length)
  const [expanded, setExpanded] = useState(active)
  const showChildren = hasChildren && !collapsed

  function handleClick() {
    if (hasChildren) {
      setExpanded((value) => !value)
      return
    }

    onNavigate(item.to)
  }

  return (
    <li>
      <button
        aria-expanded={hasChildren ? expanded : undefined}
        className={
          exactActive ? 'sidebar-link is-active' : active ? 'sidebar-link is-open' : 'sidebar-link'
        }
        onClick={handleClick}
        title={collapsed ? item.title : undefined}
        type="button"
      >
        <span className="active-bar" aria-hidden="true" />
        <Icon className="sidebar-icon" />
        <span>{item.title}</span>
        {item.children?.length ? (
          <svg
            className={expanded ? 'sidebar-chevron is-expanded' : 'sidebar-chevron'}
            aria-hidden="true"
            viewBox="0 0 24 24"
          >
            <path d="M0 0h24v24H0z" fill="none" />
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="m5 16 7-7 7 7"
            />
          </svg>
        ) : null}
      </button>
      {showChildren ? (
        <div className={expanded ? 'sidebar-subnav-wrap is-expanded' : 'sidebar-subnav-wrap'}>
          <ul className="sidebar-subnav">
            {item.children?.map((child) => (
              <li key={child.to}>
                <button
                  className={
                    pathname === child.to ? 'sidebar-sublink is-active' : 'sidebar-sublink'
                  }
                  onClick={() => onNavigate(child.to)}
                  type="button"
                >
                  {child.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  )
}
