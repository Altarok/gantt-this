export type CalendarUnit = {
  name: string
  days: number
}

export type CalendarConfig = {
  id: string
  name: string
  epochGregorian: string
  type: 'positional' | 'gregorian'
  delimiter: string
  units: CalendarUnit[]
}

export type GanttItem = {
  id: number
  name: string
  startDateDisplay: string // human-readable for UI
  endDateDisplay: string
  startDays: number // Quantized timeline tracking unit: Days from default point zero
  endDays: number
  group: string
  type: 'bar' | 'point'
  calendarType: string
  color?: string
  link?: string
  lane?: number
}

export type GanttGroup = {
  name: string
  items: GanttItem[]
  yOffset: number
  height: number
  lanes: number
}
