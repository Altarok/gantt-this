import {Notice, parseYaml, TFile} from 'obsidian'
import {CalendarConfig, PluginSettings} from '../const/types'
import FantasyGanttPlugin from '../main'
import {FrontMatterUtil} from "./frontmatter-reader";
import {runOffsetCalculations} from "./calendar-frontmatter-reader-util";


const yamlRegex = /```yaml\s([\s\S]*?)```/

/**
 * Reads folder contents and build calendar definitions.
 * @param plugin
 * @param calendarId name reference of calendar, must  match front-matter property
 * @param pluginSettings partial plugin settings
 */
export async function getCalendarDefinition(plugin: FantasyGanttPlugin,
                                            calendarId: string,
                                            pluginSettings: PluginSettings): Promise<CalendarConfig | null> {

//  if (calendarId === 'french-revolution') debugger

  if (!calendarId || !pluginSettings) {
    debugger
    return null
  }

  const cachedCalendarConfig = plugin.calendarConfigsCache.get(calendarId)


  if (cachedCalendarConfig) {
    console.log(`Found calendar config for calendar id ${calendarId}. Return cached calendar config.`)
    return cachedCalendarConfig
  }

  let targetFile = getMatchingMarkdownFile(plugin, pluginSettings, calendarId)

  if (!targetFile) return null

  const content = await plugin.app.vault.read(targetFile)
  const match = yamlRegex.exec(content)

  if (!match?.[1]) return null

  try {
    const newCalendarConfig = parseYaml(match[1]) as CalendarConfig

    /* Calculate offset once! */
    newCalendarConfig.offsetToDayZero = runOffsetCalculations(newCalendarConfig.epochGregorian)

    /* Cache calendar: */
    console.log(`Caching calendar config for calendar id ${calendarId}.`)
    plugin.calendarConfigsCache.set(calendarId, newCalendarConfig)
    return newCalendarConfig
  } catch (_error) {
    new Notice(`Gantt Plugin: Failed to parse YAML for calendar '${calendarId}'`)
    return null
  }
}


/**
 * Search for Markdown file defining the missing calendar config.
 * @param plugin
 * @param pluginSettings
 * @param calendarId
 */
function getMatchingMarkdownFile(plugin: FantasyGanttPlugin,
                                 pluginSettings: PluginSettings,
                                 calendarId: string): TFile | null {

  const allFiles: TFile[] = plugin.app.vault.getMarkdownFiles()

  /* Normalize root path references */
  const calendarSourcePath = pluginSettings.calendarPath === '/' ? '' : pluginSettings.calendarPath

  const files: TFile[] = allFiles.filter(f => {
    const parentPath = f.parent?.path ?? ''

    if (pluginSettings.calendarPathSearchRecursive) {
      return calendarSourcePath === '' || parentPath === calendarSourcePath || parentPath.startsWith(calendarSourcePath + '/')
    }

    return parentPath === calendarSourcePath
  })

  for (const file of files) {
    const fileMetadata = plugin.app.metadataCache.getFileCache(file)
    if (fileMetadata?.frontmatter && FrontMatterUtil.isMatchingCalendarDefinition(fileMetadata.frontmatter, pluginSettings, calendarId))
      return file
  }
  return null
}
