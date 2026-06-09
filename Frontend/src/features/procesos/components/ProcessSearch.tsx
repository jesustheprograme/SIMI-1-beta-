import { SearchIcon } from '../../workspace/icons'

export function ProcessSearch({
  onQueryChange,
  query,
}: {
  onQueryChange: (query: string) => void
  query: string
}) {
  return (
    <section className="groups-search" aria-label="Buscar procesos">
      <SearchIcon />
      <input
        aria-label="Buscar procesos"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Buscar por proceso, cliente, ubicacion o variable"
        type="search"
        value={query}
      />
    </section>
  )
}
