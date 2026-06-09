import type { CreatedSensorGroup } from '../types/groups'
import type { GroupSection } from '../types/groupSections'

export const DEFAULT_GROUP_SECTION_ID = 'group-section-default'
export function normalizeGroupSections(groups: CreatedSensorGroup[], sections: GroupSection[]) {
  const validGroupIds = new Set(groups.map((group) => group.id))
  const assignedGroupIds = new Set<string>()
  const seenSectionIds = new Set<string>()
  const customSections: GroupSection[] = []
  const storedDefaultSection = sections.find((section) => section.id === DEFAULT_GROUP_SECTION_ID)

  for (const section of sections) {
    if (section.id === DEFAULT_GROUP_SECTION_ID || seenSectionIds.has(section.id)) {
      continue
    }

    seenSectionIds.add(section.id)
    customSections.push({
      groupIds: section.groupIds.filter((groupId) => {
        if (!validGroupIds.has(groupId) || assignedGroupIds.has(groupId)) return false
        assignedGroupIds.add(groupId)
        return true
      }),
      id: section.id,
      title: section.title.trim() || 'Seccion sin titulo',
    })
  }

  const unassignedGroupIds = (storedDefaultSection?.groupIds ?? []).filter((groupId) => {
    if (!validGroupIds.has(groupId) || assignedGroupIds.has(groupId)) return false
    assignedGroupIds.add(groupId)
    return true
  })

  for (const group of groups) {
    if (assignedGroupIds.has(group.id)) continue
    assignedGroupIds.add(group.id)
    unassignedGroupIds.push(group.id)
  }

  return [
    ...customSections,
    {
      groupIds: unassignedGroupIds,
      id: DEFAULT_GROUP_SECTION_ID,
      title: 'Sin seccion',
    },
  ]
}

export function moveGroupToSection(
  sections: GroupSection[],
  groupId: string,
  targetSectionId: string,
  targetIndex: number,
) {
  const withoutGroup = sections.map((section) => ({
    ...section,
    groupIds: section.groupIds.filter((currentGroupId) => currentGroupId !== groupId),
  }))

  return withoutGroup.map((section) => {
    if (section.id !== targetSectionId) return section

    const nextGroupIds = [...section.groupIds]
    const safeIndex = Math.max(0, Math.min(targetIndex, nextGroupIds.length))
    nextGroupIds.splice(safeIndex, 0, groupId)

    return {
      ...section,
      groupIds: nextGroupIds,
    }
  })
}

export function swapGroupPositions(sections: GroupSection[], firstGroupId: string, secondGroupId: string) {
  const firstLocation = findGroupLocation(sections, firstGroupId)
  const secondLocation = findGroupLocation(sections, secondGroupId)
  if (!firstLocation || !secondLocation) return sections

  return sections.map((section, sectionIndex) => {
    if (sectionIndex !== firstLocation.sectionIndex && sectionIndex !== secondLocation.sectionIndex) {
      return section
    }

    const groupIds = [...section.groupIds]
    if (sectionIndex === firstLocation.sectionIndex) {
      groupIds[firstLocation.itemIndex] = secondGroupId
    }
    if (sectionIndex === secondLocation.sectionIndex) {
      groupIds[secondLocation.itemIndex] = firstGroupId
    }
    return { ...section, groupIds }
  })
}

export function createGroupSection(sections: GroupSection[], title: string, id: string) {
  const nextSection = { groupIds: [], id, title: title.trim() || 'Nueva seccion' }
  const defaultIndex = sections.findIndex((section) => section.id === DEFAULT_GROUP_SECTION_ID)

  if (defaultIndex === -1) return [...sections, nextSection]

  return [
    ...sections.slice(0, defaultIndex),
    nextSection,
    ...sections.slice(defaultIndex),
  ]
}

export function sectionsEqual(left: GroupSection[], right: GroupSection[]) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function findGroupLocation(sections: GroupSection[], groupId: string) {
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const itemIndex = sections[sectionIndex].groupIds.indexOf(groupId)
    if (itemIndex >= 0) return { itemIndex, sectionIndex }
  }
  return null
}
