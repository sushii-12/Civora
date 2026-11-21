import type { CollectionPoint, CollectionStatus, ReportStatus } from '../api/types'

const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })
const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export const formatNumber = (value: number) => number.format(value)
export const formatDate = (value: string | null) => value ? dateTime.format(new Date(value)) : '—'
export const humanize = (value: string) => value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())
export const byNewest = (first: string, second: string) => Date.parse(second) - Date.parse(first)

export const wasteTypes = ['wet', 'dry', 'mixed'] as const
export const collectionStatuses = ['pending', 'assigned', 'in_progress', 'completed'] as const
export const reportStatuses = ['pending', 'under_review', 'assigned', 'resolved', 'rejected'] as const
export const reportTypes = ['improper_dumping', 'waste_not_collected'] as const
export const reportTransitions: Record<ReportStatus, readonly ReportStatus[]> = {
  pending: ['under_review', 'rejected'],
  under_review: ['assigned', 'resolved', 'rejected'],
  assigned: ['under_review', 'resolved', 'rejected'],
  resolved: [],
  rejected: [],
}

export const isActiveAssignment = (status: CollectionStatus | undefined) =>
  status === 'assigned' || status === 'in_progress'

export function pointLabel(points: CollectionPoint[] | undefined, id: number | null) {
  if (id === null) return '—'
  return points?.find((point) => point.id === id)?.name ?? `Point #${id}`
}

export function idMatches(value: number | null, filter: string) {
  return filter === '' || String(value) === filter
}

export function matches(query: string, ...terms: (string | number | null)[]) {
  const needle = query.trim().toLocaleLowerCase()
  return !needle || terms.some((term) => String(term ?? '').toLocaleLowerCase().includes(needle))
}

export function upsert<T extends { id: number }>(items: T[], item: T) {
  return items.some(({ id }) => id === item.id)
    ? items.map((candidate) => candidate.id === item.id ? item : candidate)
    : [item, ...items]
}

export function pointChoices(points: CollectionPoint[] | undefined, ids: (number | null)[]) {
  const options = [...new Set(ids)].filter((id) => id !== null)
    .map((id) => ({ value: String(id), label: pointLabel(points, id) }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
  return [{ value: '', label: 'All collection points' }, ...options]
}
