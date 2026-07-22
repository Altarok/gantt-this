import {Notice, parseYaml, TFile} from 'obsidian'
import {CalendarConfig, PluginSettings} from '../const/types'
import FantasyGanttPlugin from '../main'

const yamlRegex = /```yaml\s([\s\S]*?)```/

/**
 * Reads folder contents and build calendar definitions.
 * @param plugin
 * @param calendarId
 * @param partialPluginSettings partial plugin settings
 */
export async function getCalendarDefinition(
  plugin: FantasyGanttPlugin,
  calendarId: string,
  partialPluginSettings: PluginSettings): Promise<CalendarConfig | null> {

  if (!calendarId || !partialPluginSettings) return null

  const cachedCalendarConfig = plugin.calendarConfigsCache.get(calendarId)

  if (cachedCalendarConfig) return cachedCalendarConfig

  let targetFile = getMatchingMarkdownFile(plugin, partialPluginSettings, calendarId);

  if (!targetFile) return null

  const content = await plugin.app.vault.read(targetFile)
  const match = yamlRegex.exec(content)

  if (!match?.[1]) return null

  try {
    const parsed = parseYaml(match[1]) as CalendarConfig
    plugin.calendarConfigsCache.set(calendarId, parsed)
    return parsed
  } catch (_error) {
    new Notice(`Gantt Plugin: Failed to parse YAML for calendar '${calendarId}'`)
    return null
  }
}

/**
 * Search for Markdown file defining the calendar config being searching.
 * @param plugin
 * @param partialPluginSettings
 * @param calendarId
 */
function getMatchingMarkdownFile(
  plugin: FantasyGanttPlugin,
  partialPluginSettings: PluginSettings,
  calendarId: string): TFile | null {

  const allFiles: TFile[] = plugin.app.vault.getMarkdownFiles()
// Normalize root path references to handle comparisons reliably
  const calendarSourcePath = partialPluginSettings.calendarPath === '/' ? '' : partialPluginSettings.calendarPath


  const files: TFile[] = allFiles.filter(f => {
    const parentPath = f.parent?.path ?? ''

    if (partialPluginSettings.calendarPathSearchRecursive) {
      return calendarSourcePath === '' || parentPath === calendarSourcePath || parentPath.startsWith(calendarSourcePath + '/')
    }

    return parentPath === calendarSourcePath
  })

  for (const file of files) {
    const fileMetadata = plugin.app.metadataCache.getFileCache(file)
    if (fileMetadata?.frontmatter?.['gantt-type-definition'] === calendarId)
      return file
  }
  return null
}
