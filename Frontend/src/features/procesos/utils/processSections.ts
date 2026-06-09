import type { CreatedProcess, ProcessType } from '../types'
import type { ProcessSection } from '../types/processSections'

export const DEFAULT_PROCESS_SECTION_ID = 'process-section-default'

export function getDefaultProcessSectionId(processType?: ProcessType) {
  return processType ? `${DEFAULT_PROCESS_SECTION_ID}:${processType}` : DEFAULT_PROCESS_SECTION_ID
}

export function migrateProcessSectionsByType(
  processes: CreatedProcess[],
  sections: ProcessSection[],
) {
  if (sections.every((section) => section.processType)) return sections

  const processTypesById = new Map(processes.map((process) => [process.id, process.processType]))
  const migrated: ProcessSection[] = []

  for (const section of sections) {
    if (section.processType) {
      migrated.push(section)
      continue
    }

    const processTypes = new Set(
      section.processIds
        .map((processId) => processTypesById.get(processId))
        .filter((processType): processType is ProcessType => Boolean(processType)),
    )
    const targetTypes = processTypes.size
      ? [...processTypes]
      : section.id === DEFAULT_PROCESS_SECTION_ID
        ? (['almacenado', 'maduracion', 'proceso-3'] satisfies ProcessType[])
        : (['almacenado'] satisfies ProcessType[])

    for (const processType of targetTypes) {
      migrated.push({
        ...section,
        id: section.id === DEFAULT_PROCESS_SECTION_ID
          ? getDefaultProcessSectionId(processType)
          : `${section.id}:${processType}`,
        processIds: section.processIds.filter(
          (processId) => processTypesById.get(processId) === processType,
        ),
        processType,
      })
    }
  }

  return migrated
}

export function getProcessSectionsForType(
  sections: ProcessSection[],
  processType?: ProcessType,
) {
  return processType
    ? sections.filter((section) => section.processType === processType)
    : sections
}

export function replaceProcessSectionsForType(
  sections: ProcessSection[],
  nextSections: ProcessSection[],
  processType?: ProcessType,
) {
  if (!processType) return nextSections
  return [
    ...sections.filter((section) => section.processType !== processType),
    ...nextSections.map((section) => ({ ...section, processType })),
  ]
}

export function normalizeProcessSections(
  processes: CreatedProcess[],
  sections: ProcessSection[],
  processType?: ProcessType,
) {
  const validProcessIds = new Set(processes.map((process) => process.id))
  const assignedProcessIds = new Set<string>()
  const seenSectionIds = new Set<string>()
  const customSections: ProcessSection[] = []
  const defaultSectionId = getDefaultProcessSectionId(processType)
  const storedDefaultSection = sections.find(
    (section) => section.id === defaultSectionId,
  )

  for (const section of sections) {
    if (section.id === defaultSectionId || seenSectionIds.has(section.id)) continue
    seenSectionIds.add(section.id)
    customSections.push({
      id: section.id,
      processIds: section.processIds.filter((processId) => {
        if (!validProcessIds.has(processId) || assignedProcessIds.has(processId)) return false
        assignedProcessIds.add(processId)
        return true
      }),
      processType,
      title: section.title.trim() || 'Seccion sin titulo',
    })
  }

  const unassignedProcessIds = (storedDefaultSection?.processIds ?? []).filter((processId) => {
    if (!validProcessIds.has(processId) || assignedProcessIds.has(processId)) return false
    assignedProcessIds.add(processId)
    return true
  })

  for (const process of processes) {
    if (assignedProcessIds.has(process.id)) continue
    assignedProcessIds.add(process.id)
    unassignedProcessIds.push(process.id)
  }

  return [
    ...customSections,
    {
      id: defaultSectionId,
      processIds: unassignedProcessIds,
      processType,
      title: 'Sin seccion',
    },
  ]
}

export function createProcessSection(
  sections: ProcessSection[],
  title: string,
  id: string,
  processType?: ProcessType,
) {
  const nextSection = { id, processIds: [], processType, title: title.trim() || 'Nueva seccion' }
  const defaultSectionId = getDefaultProcessSectionId(processType)
  const defaultIndex = sections.findIndex((section) => section.id === defaultSectionId)
  if (defaultIndex === -1) return [...sections, nextSection]
  return [...sections.slice(0, defaultIndex), nextSection, ...sections.slice(defaultIndex)]
}

export function deleteProcessSection(sections: ProcessSection[], sectionId: string) {
  const sectionToDelete = sections.find((section) => section.id === sectionId)
  if (!sectionToDelete) return sections

  const defaultSectionId = getDefaultProcessSectionId(sectionToDelete.processType)
  if (sectionId === defaultSectionId) return sections

  return sections
    .filter((section) => section.id !== sectionId)
    .map((section) =>
      section.id === defaultSectionId
        ? {
            ...section,
            processIds: Array.from(
              new Set([...section.processIds, ...sectionToDelete.processIds]),
            ),
          }
        : section,
    )
}

export function moveProcessToSection(
  sections: ProcessSection[],
  processId: string,
  targetSectionId: string,
  targetIndex: number,
) {
  const withoutProcess = sections.map((section) => ({
    ...section,
    processIds: section.processIds.filter((id) => id !== processId),
  }))

  return withoutProcess.map((section) => {
    if (section.id !== targetSectionId) return section
    const processIds = [...section.processIds]
    processIds.splice(Math.max(0, Math.min(targetIndex, processIds.length)), 0, processId)
    return { ...section, processIds }
  })
}

export function swapProcessPositions(
  sections: ProcessSection[],
  firstProcessId: string,
  secondProcessId: string,
) {
  const firstLocation = findProcessLocation(sections, firstProcessId)
  const secondLocation = findProcessLocation(sections, secondProcessId)
  if (!firstLocation || !secondLocation) return sections

  return sections.map((section, sectionIndex) => {
    if (sectionIndex !== firstLocation.sectionIndex && sectionIndex !== secondLocation.sectionIndex) {
      return section
    }

    const processIds = [...section.processIds]
    if (sectionIndex === firstLocation.sectionIndex) {
      processIds[firstLocation.itemIndex] = secondProcessId
    }
    if (sectionIndex === secondLocation.sectionIndex) {
      processIds[secondLocation.itemIndex] = firstProcessId
    }
    return { ...section, processIds }
  })
}

export function processSectionsEqual(left: ProcessSection[], right: ProcessSection[]) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function filterProcessSections(sections: ProcessSection[], visibleProcessIds: Set<string>) {
  return sections.map((section) => ({
    ...section,
    processIds: section.processIds.filter((id) => visibleProcessIds.has(id)),
  }))
}

export function mergeVisibleProcessSections(
  allSections: ProcessSection[],
  visibleSections: ProcessSection[],
  visibleProcessIds: Set<string>,
) {
  const visibleBySection = new Map(visibleSections.map((section) => [section.id, section.processIds]))
  return allSections.map((section) => ({
    ...section,
    processIds: [
      ...section.processIds.filter((id) => !visibleProcessIds.has(id)),
      ...(visibleBySection.get(section.id) ?? []),
    ],
  }))
}

function findProcessLocation(sections: ProcessSection[], processId: string) {
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const itemIndex = sections[sectionIndex].processIds.indexOf(processId)
    if (itemIndex >= 0) return { itemIndex, sectionIndex }
  }
  return null
}
