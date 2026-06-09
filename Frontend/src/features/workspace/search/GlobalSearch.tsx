import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { SearchIcon } from '../icons'
import type { CreatedSensorGroup } from '../../telemetria'
import type { PlanoLocationZone } from '../../plano'
import type { CreatedProcess } from '../../procesos'
import { buildSearchIndex, filterSearchItems } from './searchIndex'

type Props = {
  groups: CreatedSensorGroup[]
  onNavigate: (path: string) => void
  processes: CreatedProcess[]
  zones: PlanoLocationZone[]
}

export function GlobalSearch({ groups, onNavigate, processes, zones }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const index = useMemo(() => buildSearchIndex(groups, processes, zones), [groups, processes, zones])
  const results = useMemo(() => filterSearchItems(index, deferredQuery), [deferredQuery, index])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
        window.requestAnimationFrame(() => inputRef.current?.focus())
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleShortcut)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleShortcut)
    }
  }, [])

  function select(path: string) {
    onNavigate(path)
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((value) => Math.min(value + 1, results.length - 1))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((value) => Math.max(value - 1, 0))
    }
    if (event.key === 'Enter' && results[activeIndex]) select(results[activeIndex].path)
  }

  function toggleSearch() {
    setOpen((value) => !value)
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div className="global-search" data-open={open} ref={rootRef}>
      <button aria-expanded={open} aria-label="Abrir busqueda global" className="mobile-search-toggle" onClick={toggleSearch} type="button">
        <SearchIcon />
      </button>
      <label className="header-search">
        <SearchIcon />
        <input
          aria-autocomplete="list"
          aria-controls="workspace-search-results"
          aria-expanded={open}
          aria-label="Buscar en el espacio de trabajo"
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar sensores, procesos, grupos..."
          ref={inputRef}
          type="search"
          value={query}
        />
        <kbd>Ctrl K</kbd>
      </label>
      <div className="global-search-panel" id="workspace-search-results" role="listbox">
        <div className="global-search-caption">
          <span>{query ? 'Resultados' : 'Accesos rapidos'}</span>
          <small>{results.length} opciones</small>
        </div>
        {results.length ? (
          <div className="global-search-results">
            {results.map((item, resultIndex) => (
              <button aria-selected={resultIndex === activeIndex} className="global-search-result" key={item.id} onClick={() => select(item.path)} onMouseEnter={() => setActiveIndex(resultIndex)} role="option" type="button">
                <span className="search-result-copy">
                  <span><strong>{item.title}</strong><small>{item.category}</small></span>
                  <em>{item.breadcrumb}</em>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="global-search-empty">
            <SearchIcon />
            <strong>Sin coincidencias</strong>
            <span>Prueba con un nombre, codigo o ubicacion.</span>
          </div>
        )}
      </div>
    </div>
  )
}
