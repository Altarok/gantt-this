import {Notice, parseYaml, TFile} from 'obsidian'
import {CalendarConfig, CodeBlockContent, PluginSettings} from '../const/types'
import FantasyGanttPlugin from '../main'
import {FrontMatterUtil} from './frontmatter-reader'
import {runOffsetCalculations} from '../date-calculations/calendar-offset-calc'
import {Consts} from "../const/constants";

const yamlRegex = /```yaml\s([\s\S]*?)```/

/**
 * Reads folder contents and build calendar definitions.
 * @param plugin
 * @param calendarId name reference of calendar, must  match front-matter property
 * @param pluginSettings partial plugin settings
 * @param codeBlockContent
 */
export async function getCalendarDefinition(plugin: FantasyGanttPlugin,
                                            calendarId: string,
                                            pluginSettings: PluginSettings,
                                            codeBlockContent: CodeBlockContent): Promise<CalendarConfig | null> {
  if (!calendarId || !pluginSettings) return null

  const cachedCalendarConfig = plugin.calendarConfigsCache.get(calendarId)

  if (cachedCalendarConfig) return cachedCalendarConfig

  let targetFile = getMatchingMarkdownFile(plugin, calendarId, pluginSettings, codeBlockContent)

  if (!targetFile) return null

  const content = await plugin.app.vault.read(targetFile)
  const match = yamlRegex.exec(content)

  if (!match?.[1]) return null

  try {
    const newCalendarConfig = parseYaml(match[1]) as CalendarConfig

    /* Calculate offset once! */
    newCalendarConfig.offsetToDayZero = runOffsetCalculations(newCalendarConfig.epochGregorian)
    newCalendarConfig.startDay = newCalendarConfig.startDay ? runOffsetCalculations(newCalendarConfig.startDay) : undefined
    newCalendarConfig.endDay = newCalendarConfig.endDay ? runOffsetCalculations(newCalendarConfig.endDay) : undefined

    /* Cache calendar: */
    plugin.calendarConfigsCache.set(calendarId, newCalendarConfig)
    return newCalendarConfig
  } catch (_error) {
    new Notice(`Gantt Plugin: Failed to parse YAML for calendar '${calendarId}'`)
    return null
  }
}


/**
 * Search for Markdown file defining the missing calendar config.
 */
function getMatchingMarkdownFile(plugin: FantasyGanttPlugin,
                                 calendarId: string,
                                 pluginSettings: PluginSettings,
                                 codeBlockContent: CodeBlockContent): TFile | null {
  const allFiles: TFile[] = plugin.app.vault.getMarkdownFiles()

  let calendarSourcePath = codeBlockContent.calendarPath ?? pluginSettings.calendarPath
  /* Normalize root path reference */
  if (calendarSourcePath === Consts.ROOT_PATH) calendarSourcePath = Consts.ROOT_PATH_NORMALIZED

  const files: TFile[] = allFiles.filter(f => {
    const parentPath = f.parent?.path ?? ''

    if (codeBlockContent.calendarPathSearchRecursive ?? pluginSettings.calendarPathSearchRecursive)
      return calendarSourcePath === '' || parentPath === calendarSourcePath || parentPath.startsWith(calendarSourcePath + '/')
    else
      return parentPath === calendarSourcePath
  })

  for (const file of files) {
    const fileMetadata = plugin.app.metadataCache.getFileCache(file)
    if (fileMetadata?.frontmatter && FrontMatterUtil.isMatchingCalendarDefinition(fileMetadata.frontmatter, pluginSettings, calendarId))
      return file
  }
  return null
}
