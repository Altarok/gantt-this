import {Notice, parseYaml, TFile} from 'obsidian'
import {
  CalendarConfig,
  CodeBlockContent,
  ParsedDate,
  PluginSettings,
  PositionalCalendarConfig,
  RuleBasedCalendarConfig,
} from '../const/types'
import {DEFAULT_CAL_DATE_FORMAT, DEFAULT_FALLBACK_CALENDAR, DEFAULT_SETTINGS} from '../const/default-values'
import FantasyGanttPlugin from '../main'
import {FrontMatterUtil} from './frontmatter-reader'
import {runOffsetCalculations} from '../date-calculations/calendar-offset-calc'
import {Consts} from '../const/constants'
import {createParsedDate} from '../date-calculations/event-date-input-calc'
import {getGregorianTodayInAbsoluteDays} from '../util/dates'
import {GregorianCalendar} from '../const/fallback-calendar'

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

  } else if (DEFAULT_FALLBACK_CALENDAR === newCalendarConfig.id.toLowerCase()) {
    /* Add the current date to gregorian calendar */
    newCalendarConfig.today = getGregorianTodayInAbsoluteDays()
  }
}

/**
 * Reads folder contents and build calendar definitions.
 * @param plugin
 * @param frontMatterUtil
 * @param calendarId name reference of calendar, must  match front-matter property
 * @param pluginSettings partial plugin settings
 * @param codeBlockContent
 */
export async function getCalendarDefinition(plugin: FantasyGanttPlugin,
                                            frontMatterUtil: FrontMatterUtil,
                                            calendarId: string,
                                            pluginSettings: PluginSettings,
                                            codeBlockContent: CodeBlockContent): Promise<CalendarConfig | null> {
  if (!calendarId || !pluginSettings) return null

  const cachedCalendarConfig: CalendarConfig | undefined = plugin.calendarConfigsCache.get(calendarId)

  if (cachedCalendarConfig) return cachedCalendarConfig

  const targetFile = getMatchingMarkdownFile(plugin, frontMatterUtil, calendarId, pluginSettings, codeBlockContent)

  if (!targetFile) return fallbackIfGregorian(calendarId, plugin)

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

    switch (newCalendarConfig.type) {
      case 'positional':
        safetyCheckPositionalConfig(newCalendarConfig)
        break
      case 'rule-based':
        safetyCheckRuleBasedConfig(newCalendarConfig)
        break
      default:
        new Notice(`Gantt Plugin: Failed to parse YAML for calendar '${calendarId}'`)
        return null
    }

    addTodayDateAsAbsoluteDay(newCalendarConfig)

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
    return GregorianCalendar
  } else return null
}

/**
 * Search for Markdown file defining the missing calendar config.
 */
function getMatchingMarkdownFile(plugin: FantasyGanttPlugin,
                                 frontMatterUtil: FrontMatterUtil,
                                 calendarId: string,
                                 pluginSettings: PluginSettings,
                                 codeBlockContent: CodeBlockContent): TFile | null {
  const allFiles: TFile[] = plugin.app.vault.getMarkdownFiles()

  let calendarSourcePath = codeBlockContent.calendarPath ?? pluginSettings.calendarPath
  /* Normalize root path reference */
  if (calendarSourcePath === Consts.ROOT_PATH) calendarSourcePath = Consts.ROOT_PATH_NORMALIZED

  const isRecursive = codeBlockContent.calendarPathSearchRecursive ?? pluginSettings.calendarPathSearchRecursive

  const files: TFile[] = allFiles.filter(f => {
    const parentPath = f.parent?.path ?? ''
    if (isRecursive)
      return calendarSourcePath === '' || parentPath === calendarSourcePath || parentPath.startsWith(calendarSourcePath + '/')
    else return parentPath === calendarSourcePath
  })

  for (const file of files) {
    const fileMetadata = plugin.app.metadataCache.getFileCache(file)
    if (fileMetadata?.frontmatter && frontMatterUtil.isMatchingCalendarDefinition(fileMetadata.frontmatter, file, calendarId))
      return file
  }
  return null
}

function safetyCheckPositionalConfig(config: PositionalCalendarConfig) {
  if (config.positionalUnits?.length === 0) {
    /* TODO throw error #errorCache */
  }
}

/**
 * Validates and populates default values for rule-based calendar configurations.
 */
function safetyCheckRuleBasedConfig(config: RuleBasedCalendarConfig) {
  const {ruleBasedDetails} = config
  config.offsetToDayZero = Number.isNaN(config.offsetToDayZero) ? 0 : config.offsetToDayZero
  ruleBasedDetails.format = ruleBasedDetails.format ?? DEFAULT_CAL_DATE_FORMAT
  ruleBasedDetails.outputFormat = ruleBasedDetails.outputFormat ?? ruleBasedDetails.format
  ruleBasedDetails.months = ruleBasedDetails.months ?? []
  if (ruleBasedDetails.leapYearRule && ruleBasedDetails.leapYearRule.ruleType !== 'none') {
    ruleBasedDetails.leapYearRule.extraDays =
      Number.isNaN(ruleBasedDetails.leapYearRule.extraDays) ? 1 : ruleBasedDetails.leapYearRule.extraDays
  }
}
