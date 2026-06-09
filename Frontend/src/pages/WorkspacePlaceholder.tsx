import { BreadcrumbNav } from '../components/ui'

export function WorkspacePlaceholder({ title }: { title: string }) {
  return (
    <div className="dashboard-page">
      <BreadcrumbNav items={['Dashboard', title]} />

      <div className="dashboard-heading">
        <h1>{title}</h1>
        <p>
          Esta sección está preparada para incorporar su contenido operativo. Por ahora solo muestra información de
          consulta.
        </p>
      </div>
    </div>
  )
}
