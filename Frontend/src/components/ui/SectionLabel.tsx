export function SectionLabel({ collapsed, label }: { collapsed: boolean; label: string }) {
  return <div className={collapsed ? 'section-label is-collapsed' : 'section-label'}>{label}</div>
}
