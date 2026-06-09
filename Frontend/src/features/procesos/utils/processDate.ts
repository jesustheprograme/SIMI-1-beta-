export function formatProcessDateTime(value?: string) {
  const date = toValidDate(value)
  if (!date) return 'Sin definir'
  return `${formatProcessDateOnly(value)} - ${formatProcessTimeOnly(value)}`
}

export function formatProcessDateOnly(value?: string) {
  const date = toValidDate(value)
  if (!date) return 'Sin definir'

  return `${date.getDate()}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

export function formatProcessTimeOnly(value?: string) {
  const date = toValidDate(value)
  if (!date) return 'Sin definir'

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function toValidDate(value?: string) {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
