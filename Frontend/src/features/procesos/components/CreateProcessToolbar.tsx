export function CreateProcessToolbar({
  onCreateClick,
  onCreateSectionClick,
}: {
  onCreateClick: () => void
  onCreateSectionClick: () => void
}) {
  return (
    <section className="sensor-page-toolbar groups-toolbar">
      <button className="create-group-button" onClick={onCreateClick} type="button">
        <span aria-hidden="true">+</span>
        Crear proceso
      </button>
      <button className="create-group-button create-section-button" onClick={onCreateSectionClick} type="button">
        <SectionIcon />
        Crear seccion
      </button>
    </section>
  )
}

function SectionIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7h16" />
      <path d="M4 12h8" />
      <path d="M4 17h16" />
    </svg>
  )
}
