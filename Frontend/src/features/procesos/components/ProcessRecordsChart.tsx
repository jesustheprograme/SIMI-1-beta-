import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from './icons'
import {
  getProcessChartColorMap,
  getProcessChartSummary,
  getProcessChartUnit,
  getProcessVariableCategories,
  loadProcessChartFilters,
  persistProcessChartFilters,
} from './processChartHelpers'
import { getProcessChartData } from './processChartGeometry'
import { ProcessRecordSvgChart } from './ProcessRecordSvgChart'
import type {
  ProcessChartRecord,
  ProcessChartVariableCategory,
  ProcessRecordVariable,
} from './types'

export function ProcessRecordsAreaChart({
  allVariables,
  processId,
  records,
}: {
  allVariables: ProcessRecordVariable[]
  processId: string
  records: ProcessChartRecord[]
}) {
  const variableSelectRef = useRef<HTMLDivElement>(null)
  const [selectedVariableIds, setSelectedVariableIds] = useState<string[]>(() =>
    loadProcessChartFilters(processId).selectedVariableIds,
  )
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<ProcessChartVariableCategory['id'][]>(() =>
    loadProcessChartFilters(processId).expandedCategoryIds,
  )
  const [isVariableMenuOpen, setIsVariableMenuOpen] = useState(false)
  const variableCategories = useMemo(
    () => getProcessVariableCategories(allVariables, records),
    [allVariables, records],
  )
  const chartColorMap = useMemo(() => getProcessChartColorMap(variableCategories), [variableCategories])
  const hasChartSelection = selectedVariableIds.length > 0
  const chartVariables = useMemo(() => {
    if (selectedVariableIds.length === 0) return []

    return allVariables.filter((variable) => selectedVariableIds.includes(variable.id))
  }, [allVariables, selectedVariableIds])
  const activeVariableId = selectedVariableIds.length === 1 ? selectedVariableIds[0] : 'all'
  const chartSummary = hasChartSelection
    ? getProcessChartSummary(records, chartVariables, activeVariableId)
    : {
        description: 'Selecciona una variable o categoria para cargar el grafico',
        title: 'Registros de sensores',
      }
  const chartSeries = useMemo(
    () => chartVariables.map((variable, index) => ({ dataKey: `value_${index}`, variable })),
    [chartVariables],
  )
  const chartData = useMemo(
    () => getProcessChartData(records, chartSeries),
    [chartSeries, records],
  )
  const yAxisUnit = useMemo(
    () => getProcessChartUnit(records, activeVariableId),
    [activeVariableId, records],
  )

  useEffect(() => {
    const availableVariableIds = new Set(allVariables.map((variable) => variable.id))
    const availableCategoryIds = new Set(variableCategories.map((category) => category.id))
    const timer = window.setTimeout(() => {
      setSelectedVariableIds((current) => current.filter((id) => availableVariableIds.has(id)))
      setExpandedCategoryIds((current) => current.filter((id) => availableCategoryIds.has(id)))
    }, 0)

    return () => window.clearTimeout(timer)
  }, [allVariables, variableCategories])

  useEffect(() => {
    persistProcessChartFilters(processId, {
      expandedCategoryIds,
      selectedVariableIds,
    })
  }, [expandedCategoryIds, processId, selectedVariableIds])

  function selectChartVariable(variableId: 'all' | string) {
    if (variableId === 'all') {
      setSelectedVariableIds(allVariables.map((variable) => variable.id))
      return
    }

    setSelectedVariableIds((current) =>
      current.includes(variableId)
        ? current.filter((id) => id !== variableId)
        : [...current, variableId],
    )
  }

  function selectChartCategory(category: ProcessChartVariableCategory) {
    if (category.variables.length === 0) return

    setSelectedVariableIds(category.variables.map((variable) => variable.id))
  }

  function clearChartSelection() {
    setSelectedVariableIds([])
    setIsVariableMenuOpen(false)
  }

  function toggleChartCategory(categoryId: ProcessChartVariableCategory['id']) {
    setExpandedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    )
  }

  return (
    <section className="process-record-chart" aria-label="Grafico de registros por ID">
      <div className="process-record-chart-card">
        <header className="process-record-chart-header">
          <div className="process-record-chart-heading">
            <strong>{chartSummary.title}</strong>
            <p>{chartSummary.description}</p>
          </div>
          <div
            className="process-record-chart-select"
            ref={variableSelectRef}
            onBlur={(event) => {
              if (!variableSelectRef.current?.contains(event.relatedTarget)) setIsVariableMenuOpen(false)
            }}
          >
            <button
              aria-expanded={isVariableMenuOpen}
              aria-haspopup="listbox"
              onClick={() => setIsVariableMenuOpen((current) => !current)}
              type="button"
            >
              <span className="process-record-chart-tags">
                <span className="process-record-chart-tag">
                  {!hasChartSelection
                    ? 'Seleccionar'
                    : `Filtros (${selectedVariableIds.length})`}
                </span>
              </span>
              <ChevronDownIcon className="process-record-chart-select-chevron" />
            </button>
            {isVariableMenuOpen ? (
              <div className="process-record-chart-select-menu" role="listbox">
                <button
                  className="process-record-chart-select-placeholder"
                  onClick={clearChartSelection}
                  role="option"
                  type="button"
                >
                  <span aria-hidden="true" />
                  <span className="process-record-chart-select-main">Seleccionar</span>
                </button>
                {variableCategories.map((category) => {
                  const isCategorySelected =
                    category.variables.length > 0 &&
                    category.variables.every((variable) => selectedVariableIds.includes(variable.id)) &&
                    selectedVariableIds.length === category.variables.length
                  const isExpanded = expandedCategoryIds.includes(category.id)

                  return (
                    <div className="process-record-chart-select-group" key={category.id}>
                      <div className="process-record-chart-select-group-row">
                        <button
                          aria-selected={isCategorySelected}
                          className={isCategorySelected ? 'is-selected' : undefined}
                          disabled={category.variables.length === 0}
                          onClick={() => selectChartCategory(category)}
                          role="option"
                          type="button"
                        >
                          <span aria-hidden="true">{isCategorySelected ? '*' : ''}</span>
                          <span className="process-record-chart-select-label">{category.label}</span>
                          <small>{category.variables.length}</small>
                        </button>
                        <button
                          aria-expanded={isExpanded}
                          aria-label={`Ver variables de ${category.label}`}
                          className="process-record-chart-select-expand"
                          disabled={category.variables.length === 0}
                          onClick={() => toggleChartCategory(category.id)}
                          type="button"
                        >
                          <ChevronRightIcon />
                        </button>
                      </div>

                      {isExpanded ? (
                        <div className="process-record-chart-select-children">
                          {category.variables.map((variable) => (
                            <button
                              aria-selected={selectedVariableIds.includes(variable.id)}
                              className={
                                selectedVariableIds.includes(variable.id)
                                  ? 'is-selected'
                                  : undefined
                              }
                              key={variable.id}
                              onClick={() => selectChartVariable(variable.id)}
                              role="option"
                              type="button"
                            >
                              <span className="process-record-chart-select-value">{variable.name}</span>
                              <span
                                aria-hidden="true"
                                className={
                                  selectedVariableIds.includes(variable.id)
                                    ? 'process-record-chart-select-check is-selected'
                                    : 'process-record-chart-select-check'
                                }
                              />
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
                <button
                  aria-selected={selectedVariableIds.length === allVariables.length}
                  className={selectedVariableIds.length === allVariables.length ? 'is-selected' : undefined}
                  disabled={allVariables.length === 0}
                  onClick={() => selectChartVariable('all')}
                  role="option"
                  type="button"
                >
                  <span aria-hidden="true">
                    {selectedVariableIds.length === allVariables.length ? '*' : ''}
                  </span>
                  <span className="process-record-chart-select-main">Todas</span>
                  <small>{allVariables.length}</small>
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <div className="process-record-chart-body">
          <div className="process-record-chart-container">
            <ProcessRecordSvgChart
              allVariables={allVariables}
              chartColorMap={chartColorMap}
              data={chartData}
              emptyMessage={!hasChartSelection ? 'Selecciona una variable para visualizar el grafico' : undefined}
              records={records}
              series={chartSeries}
              yAxisUnit={yAxisUnit}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
