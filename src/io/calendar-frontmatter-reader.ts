import {Notice, parseYaml, TFile} from 'obsidian'
import {CalendarConfig, CodeBlockContent, ParsedDate, PluginSettings} from '../const/types'
import {DEFAULT_SETTINGS} from '../const/default-values'
import FantasyGanttPlugin from '../main'
import {FrontMatterUtil} from './frontmatter-reader'
import {runOffsetCalculations} from '../date-calculations/calendar-offset-calc'
import {Consts} from '../const/constants'
import {GregorianCalendar} from '../const/fallback-calendar'
import {createParsedDate} from '../date-calculations/event-date-input-calc'
import {Dates} from '../util/dates'

const yamlRegex = /```yaml\s([\s\S]*?)```/

function addTodayDateAsAbsoluteDay(newCalendarConfig: CalendarConfig) {
  const {today} = newCalendarConfig

  if (today) {
    /* Check user input for correct type! */
    if (typeof today === 'string') {
      const parsedInput: ParsedDate | null = createParsedDate(String(today), newCalendarConfig)
      newCalendarConfig.today = parsedInput?.days ?? undefined
    } else if (typeof today !== 'number') {
      /* Number would be fine, everything else must be deleted since it would break some code */
      delete newCalendarConfig.today
    }

  } else if ('gregorian' === newCalendarConfig.id.toLowerCase()) {
    newCalendarConfig.today = Dates.getGregorianTodayInAbsoluteDays()
  }
}

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
  debugger
  if (!calendarId || !pluginSettings) return null

  const cachedCalendarConfig: CalendarConfig | undefined = plugin.calendarConfigsCache.get(calendarId)

  if (cachedCalendarConfig) {
    debugger
    return cachedCalendarConfig
  }

  let targetFile = getMatchingMarkdownFile(plugin, calendarId, pluginSettings, codeBlockContent)

  if (!targetFile) {
    debugger
    return fallbackIfGregorian(calendarId, plugin)
  }

  const content = await plugin.app.vault.read(targetFile)
  const match = yamlRegex.exec(content)

  if (!match?.[1]) return null

  try {
    const newCalendarConfig = parseYaml(match[1]) as CalendarConfig

    newCalendarConfig.link = targetFile.path

    /* Calculate offset once! */
    newCalendarConfig.offsetToDayZero = runOffsetCalculations(newCalendarConfig.sharedOffset)
    newCalendarConfig.startDay = newCalendarConfig.startDay ? runOffsetCalculations(newCalendarConfig.startDay) : undefined
    newCalendarConfig.endDay = newCalendarConfig.endDay ? runOffsetCalculations(newCalendarConfig.endDay) : undefined

    addTodayDateAsAbsoluteDay(newCalendarConfig)

    debugger

    /* Cache calendar */
    plugin.calendarConfigsCache.set(calendarId, newCalendarConfig)
    return newCalendarConfig
  } catch {
    new Notice(`Gantt Plugin: Failed to parse YAML for calendar '${calendarId}'`)
    return null
  }
}

function fallbackIfGregorian(calendarId: string, plugin: FantasyGanttPlugin): CalendarConfig | null {
  if (calendarId === DEFAULT_SETTINGS.defaultCalendar) {
    new Notice('Failed to load Gregorian calendar. Will use pre-set fallback.')
    plugin.calendarConfigsCache.set(calendarId, GregorianCalendar)
    debugger
    return GregorianCalendar
  } else return null
}

/**
 * Search for Markdown file defining the missing calendar config.
 */
function getMatchingMarkdownFile(plugin: FantasyGanttPlugin,
                                 calendarId: string,
                                 pluginSettings: PluginSettings,
                                 codeBlockContent: CodeBlockContent): TFile | null {
  const allFiles: TFile[] = plugin.app.vault.getMarkdownFiles()

  debugger

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
