export const DEFAULT_SETTINGS = {
  defaultType: 'iso-8601',
  fallbackColor: '#1565c0',
  typeColors: {} as Record<string, string>,
  groupColors: {} as Record<string, string>,
  visibleCalendars: {} as Record<string, boolean>
}

export type FantasyGanttSettings = typeof DEFAULT_SETTINGS

export function createSettings(): FantasyGanttSettings {
  return { ...DEFAULT_SETTINGS }
}
