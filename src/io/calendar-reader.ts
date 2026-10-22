import {Notice, parseYaml, TFile} from 'obsidian'
import {ParsedDate} from '../types/settings-types'
import {CalendarConfig, PositionalCalendarConfig, RuleBasedCalendarConfig} from '../types/calendar-types'
import {DEFAULT_CAL_DATE_FORMAT, DEFAULT_FALLBACK_CALENDAR} from '../const/default-values'
import {runOffsetCalculations} from '../date-calculations/calendar-offset-calc'
import {createParsedDate} from '../date-calculations/event-date-input-calc'
import {getGregorianTodayInAbsoluteDays} from '../date-calculations/dates'
import {GregorianCalendar} from '../const/fallback-calendar'
import {getCalendarFiles} from './io-util'
import {GanttError, throwGanttError} from '../model/gantt-error'
import {ChartContext} from '../model/chart-context'
import {debug} from '../util/debug'

const yamlRegex = /```yaml\s([\s\S]*?)```/

export async function cacheKnownCalendars(chartCtx: ChartContext,
                                          rawChartInputCalendar?: string) {
  const calendarIDs: string[] = chartCtx.settings.calendars.map(c => c.id)

  if (calendarIDs?.length === 0) throwGanttError('noRegisteredCalendar')
  else chartCtx.diagnostics.totalCalendars = calendarIDs.length

  if (rawChartInputCalendar) calendarIDs.push(rawChartInputCalendar)

  await getCalendarDefinitions(calendarIDs, chartCtx)
}

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

export async function getCalendarDefinition(calendarID: string,
                                            chartCtx: ChartContext): Promise<CalendarConfig | null> {

  const cachedCalendarConfig: CalendarConfig | undefined = chartCtx.calendarCache.get(calendarID)
  if (cachedCalendarConfig) return cachedCalendarConfig

  await getCalendarDefinitions([calendarID], chartCtx)

  return chartCtx.calendarCache.get(calendarID) ?? null
}

/**
 * Reads folder contents and build calendar definitions.
 * @param calendarIDs name reference of calendar, must  match front-matter property
 * @param chartCtx
 */
async function getCalendarDefinitions(calendarIDs: string[],
                                      chartCtx: ChartContext): Promise<void> {
  if (!calendarIDs || calendarIDs.length < 1 || !chartCtx.settings) return

  const allKnownCalendarIDs: string[] = chartCtx.settings.calendars.map(c => c.id)
  const calendarCache = chartCtx.calendarCache

  // const calendarsNotAlreadyLoaded: string[] = filterNonExistentCalendars(chartCtx, calendarIDs)

  const allFiles: TFile[] = getCalendarFiles(chartCtx)

  // const mappedFiles: Record<string, TFile> = filterMatchingCalendarFiles(allFiles, calendarsNotAlreadyLoaded, chartCtx)
  //   > !chartCtx.calendarCache.get(c))
// }
  for (const file of allFiles) {
    const fileMetadata = chartCtx.metadataCache.getFileCache(file)
    if (!fileMetadata?.frontmatter) continue
    const calendarID = chartCtx.propertyReader.getCalendarId(fileMetadata.frontmatter, file)
    if (!calendarID) continue /* nothing to load */
    if (calendarCache.get(calendarID)) continue /* already loaded - TODO compare! */
    if (!allKnownCalendarIDs.includes(calendarID)) chartCtx.diagnostics.addLog('unregisteredCalendar', {calendarID})
    try {
      await loadCalendar(chartCtx, calendarID, file)
    } catch (err) {
      if (err instanceof GanttError) chartCtx.diagnostics.addErr(err, file)
    }
  }

  // for (const calendarID of Object.keys(mappedFiles)) {
  //   const file = mappedFiles[calendarID]
  //   try {
  //     await loadCalendar(chartCtx, calendarID, file)
  //   } catch (err) {
  //     if (err instanceof GanttError) chartCtx.diagnostics.addErr(err, file)
  //   }
  // }
}

// /**
//  * Search for Markdown file defining the missing calendar config.
//  */
// function filterMatchingCalendarFiles(files: TFile[],
//                                      calendarsToLoad: string[],
//                                      chartCtx: ChartContext): Record<string, TFile> {
//   const mappedFiles: Record<string, TFile> = {}
//
//   for (const file of files) {
//     const fileMetadata = chartCtx.metadataCache.getFileCache(file)
//     if (!fileMetadata?.frontmatter) continue
//     const calendarID = chartCtx.propertyReader.getCalendarId(fileMetadata.frontmatter, file)
//     if (!calendarID || !calendarsToLoad.includes(calendarID)) continue
//     mappedFiles[calendarID] = file
//   }
//   return mappedFiles
// }
// function filterNonExistentCalendars(chartCtx: ChartContext, calendarIDs: string[]) {
//   return calendarIDs.filter(c => !chartCtx.calendarCache.get(c))
// }

async function loadCalendar(chartCtx: ChartContext, calendarID: string, file?: TFile): Promise<void> {

  if (!calendarID) return
  if (!file) return fallbackIfGregorian(calendarID, chartCtx)

  const content = await chartCtx.vault.read(file)
  const match = yamlRegex.exec(content)

  if (!match?.[1]) return

  try {
    const newCalendarConfig = parseYaml(match[1]) as CalendarConfig

    newCalendarConfig.link = file.path

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
        new Notice(`Gantt Plugin: Failed to parse YAML for calendar '${calendarID}'`)
        return
    }

    addTodayDateAsAbsoluteDay(newCalendarConfig)

    /* Cache calendar */
    chartCtx.calendarCache.set(calendarID, newCalendarConfig)
  } catch (err) {
    if (err instanceof GanttError) {
      chartCtx.diagnostics.addErr(err, file)
    } else if (err instanceof Error && err.name === 'YAMLParseError') {
      const yamlErr = err as Error & { code?: string; linePos?: { line: number; col: number }[] }
      let suffix = ''
      if (yamlErr.linePos?.[0]) {
        const {line, col} = yamlErr.linePos[0]
        suffix = ` Problem at line ${line}, column ${col}.`
      }
      const description = `YAMLParseError. ${yamlErr.code ?? ''}. ${suffix}`
      chartCtx.diagnostics.addLog('calendarYAMLParseError', {id: calendarID, description}, file?.path)
      debug.warn(`YAML Parse Error [${yamlErr.code}]: ${yamlErr.message}`)
    }
  }
}

function fallbackIfGregorian(calendarId: string, chartCtx: ChartContext,): void {
  if (calendarId === DEFAULT_FALLBACK_CALENDAR) {
    new Notice(`Failed to load 'gregorian' calendar. Will use pre-set fallback.`)
    chartCtx.calendarCache.set(calendarId, GregorianCalendar)
  }
}

function safetyCheckPositionalConfig(config: PositionalCalendarConfig) {
  if (config.positionalUnits?.length === 0) {
    throwGanttError('positionalCalendarMissingSegments', {id: config.id})
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

  if (ruleBasedDetails.months.length > 0) {
    let expectedDaysInYear = 0
    ruleBasedDetails.months.forEach(month => expectedDaysInYear += month.days)
    if (expectedDaysInYear !== ruleBasedDetails.daysInStandardYear) throwGanttError('calendarDaysInStandardMismatch',
      {calendarID: config.id, daysInStandardYear: ruleBasedDetails.daysInStandardYear})
  }
}
