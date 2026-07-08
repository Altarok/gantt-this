import {PluginSettings} from "./types";

function toEventPath(value: string, currentFolder: string, pluginSettings: PluginSettings): void {
  if (!value) return
  else if (value.toLowerCase() === 'root') pluginSettings.eventPath = '/'
  else if (value.toLowerCase() === 'local') pluginSettings.eventPath = currentFolder
  else pluginSettings.eventPath = value
}

function toEventPathSearchRecursive(value: string, pluginSettings: PluginSettings): void {
  if (!value) return
  pluginSettings.eventPathSearchRecursive = value.toLowerCase() === 'true'
}

function toCalendarPath(value: string, currentFolder: string, pluginSettings: PluginSettings): void {
  if (!value) return
  else if (value.toLowerCase() === 'root') pluginSettings.calendarPath = '/'
  else if (value.toLowerCase() === 'local') pluginSettings.calendarPath = currentFolder
  else pluginSettings.calendarPath = value
}

function toCalendarPathSearchRecursive(value: string, pluginSettings: PluginSettings): void {
  if (!value) return
  pluginSettings.calendarPathSearchRecursive = value.toLowerCase() === 'true'
}

export function readCodeBlock(pluginSettings: PluginSettings, currentFolder: string, source: string): PluginSettings {

  let settings: PluginSettings = Object.assign({}, pluginSettings)
  const lines = source.split('\n').filter(Boolean)

  for (const line of lines) {
    if (!line.contains(':')) continue
    let split = line.split(':', 2);
    const key = split[0]?.trim()
    const value = split[1]?.trim()
    if (!key || !value) continue
    if (key === 'eventPath') toEventPath(value, currentFolder, settings)
    if (key === 'eventPathSearchRecursive') toEventPathSearchRecursive(value, settings)
    if (key === 'calendarPath') toCalendarPath(value, currentFolder, settings)
    if (key === 'calendarPathSearchRecursive') toCalendarPathSearchRecursive(value, settings)
  }

  return settings
}
