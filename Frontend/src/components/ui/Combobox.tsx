import { useEffect, useMemo, useRef, useState } from 'react'
import type { SVGProps } from 'react'

export type ComboboxOption = {
  value: string
  label: string
  description?: string
}

type ComboboxProps = {
  className?: string
  disabled?: boolean
  emptyText?: string
  onChange?: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
  searchPlaceholder?: string
  value?: string
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <path d="m20 6-11 11-5-5" />
    </svg>
  )
}

function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function Combobox({
  className,
  disabled,
  emptyText = 'Sin resultados',
  onChange,
  options,
  placeholder = 'Selecciona una opcion',
  searchPlaceholder = 'Buscar...',
  value,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = options.find((option) => option.value === value)

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return options
    }

    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(normalizedQuery) ||
        option.description?.toLowerCase().includes(normalizedQuery),
    )
  }, [options, query])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const timer = window.setTimeout(() => inputRef.current?.focus(), 180)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div
      ref={containerRef}
      className={cx('combobox', open && 'is-open', disabled && 'is-disabled', className)}
    >
      <button
        aria-expanded={open}
        className={cx('combobox-trigger', !selected && 'is-placeholder')}
        disabled={disabled}
        onClick={() => {
          setOpen((value) => {
            if (!value) setQuery('')
            return !value
          })
        }}
        type="button"
      >
        <span>{selected ? selected.label : placeholder}</span>
        <ChevronDownIcon className={cx('combobox-chevron', open && 'is-open')} />
      </button>

      <div className={cx('combobox-panel-wrap', open && 'is-open')}>
        <div className="combobox-panel">
          <div className="combobox-search">
            <SearchIcon />
            <input
              ref={inputRef}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              value={query}
            />
          </div>

          <div className="combobox-list">
            {filtered.length === 0 ? (
              <div className="combobox-empty">{emptyText}</div>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value

                return (
                  <button
                    key={option.value}
                    className={cx('combobox-option', isSelected && 'is-selected')}
                    onClick={() => {
                      onChange?.(option.value)
                      setOpen(false)
                    }}
                    style={{ animationDelay: `${index * 25}ms` }}
                    type="button"
                  >
                    <span>
                      <strong>{option.label}</strong>
                      {option.description ? <small>{option.description}</small> : null}
                    </span>
                    <CheckIcon className={cx('combobox-check', isSelected && 'is-visible')} />
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
