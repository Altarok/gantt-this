/*
 * Class added in the hopes of being able to skip year zero.
 *
 * Step 1: The Calendar Math LogicWhen noYearZero: true is enabled in a calendar specification, there is no year 0.
 *  The timeline jumps directly from year -1 (BC/BCE) to year 1 (AD/CE).
 * To translate between absolute days ($D$) and calendrical years ($Y$):
 *
 * Calculated Year $\to$ Displayed Year:
 *
 * $$\text{Displayed Year} = \begin{cases} Y & \text{if } Y > 0 \text{ or } \text{noYearZero is } \mathbf{false} \\ Y - 1 & \text{if } Y \le 0 \text{ and } \text{noYearZero is } \mathbf{true} \end{cases}$$
 *
 * Displayed Year $\to$ Internal Calculated Year:
 *
 * $$\text{Internal Year} = \begin{cases} Y_{\text{disp}} & \text{if } Y_{\text{disp}} > 0 \text{ or } \text{noYearZero is } \mathbf{false} \\ Y_{\text{disp}} + 1 & \text{if } Y_{\text{disp}} < 0 \text{ and } \text{noYearZero is } \mathbf{true} \end{cases}$$
 */

// export interface CalendarRuleDetails {
//   daysInStandardYear: number;
//   noYearZero?: boolean; // New YAML property TODO
//   leapYearRule?: {
//     ruleType: 'none' | 'gregorian' | 'interval';
//     intervalYears?: number;
//     extraDays?: number;
//     applyToMonthIndex?: number;
//   };
//   months?: Array<{ name?: string; shortname?: string; days: number }>;
//   format?: string[];
//   outputFormat?: string[];
// }
//
// export interface CalendarConfig {
//   id: string;
//   type: 'rule-based' | 'positional';
//   offsetToDayZero: number;
//   delimiter: string;
//   bcSuffix?: string;
//   adSuffix?: string;
//   sharedOffset?: number | { year: number };
//   ruleBasedDetails?: CalendarRuleDetails;
//   positionalUnits?: Array<{ name: string; days: number }>;
// }

import {CalendarConfig} from '../const/types'
import {isCustomLeapYear, isLeapYear} from './leap-year-calc'

export class CalendarCalculator {
  /** Checks whether a target year is a leap year according to rules */
  private static isLeapYear(year: number, config: CalendarConfig): boolean {
    const details = config.ruleBasedDetails
    if (!details?.leapYearRule || details.leapYearRule.ruleType === 'none') return false

    if (details.leapYearRule.ruleType === 'gregorian') {
      const absYear = Math.abs(year)
      return (absYear % 4 === 0 && absYear % 100 !== 0) || absYear % 400 === 0
    }

    if (details.leapYearRule.ruleType === 'interval') {
      const interval = details.leapYearRule.intervalYears
      return !!interval && interval > 0 && Math.abs(year) % interval === 0
    }

    return false
  }

  /** Convert absolute day number to date string for Non-Gregorian Calendars */
  public static parseDaysToNonGregorianDateString(days: number,
                                                  config: CalendarConfig,
                                                  asInput = false): string {

    const details = config.ruleBasedDetails
    if (!details) return `Error: No details found for ${config.id}`

    const noYearZero = !!details.noYearZero
    let remainingDays = days - config.offsetToDayZero
    let year = 1

    // Handle interval-based leap cycles if present
    if (details.leapYearRule?.ruleType === 'interval' && details.leapYearRule.intervalYears) {
      const interval = details.leapYearRule.intervalYears
      const extra = details.leapYearRule.extraDays ?? 1
      const daysInCycle = details.daysInStandardYear * interval + extra

      if (Math.abs(remainingDays) > daysInCycle) {
        const cycles = Math.floor(remainingDays / daysInCycle)
        year += cycles * interval
        remainingDays -= cycles * daysInCycle
      }
    }

    // Advance or rewind years
    if (remainingDays > 0) {
      while (true) {
        const isLeap = this.isLeapYear(year, config)
        const daysInYear = details.daysInStandardYear + (isLeap ? details.leapYearRule?.extraDays ?? 1 : 0)
        if (remainingDays > daysInYear) {
          remainingDays -= daysInYear
          year++
        } else {
          break
        }
      }
    } else {
      while (remainingDays <= 0) {
        year--
        const isLeap = this.isLeapYear(year, config)
        const daysInYear = details.daysInStandardYear + (isLeap ? details.leapYearRule?.extraDays ?? 1 : 0)
        remainingDays += daysInYear
      }
    }

    // Resolve displayed year when year zero is absent
    let displayedYear = year
    if (noYearZero && year <= 0) {
      displayedYear = year - 1
    }

    // Calculate month and day
    let monthName = ''
    let dayOfPeriod = 1
    const isLeap = this.isLeapYear(year, config)

    if (details.months && details.months.length > 0) {
      for (let m = 0; m < details.months.length; m++) {
        const monthDef = details.months[m]
        if (!monthDef) break

        let monthDays = monthDef.days
        if (isLeap && details.leapYearRule?.applyToMonthIndex === m) {
          monthDays += details.leapYearRule.extraDays ?? 1
        }

        if (remainingDays > monthDays) {
          remainingDays -= monthDays;
        } else {
          monthName = monthDef.shortname ?? monthDef.name ?? String(m + 1)
          dayOfPeriod = remainingDays
          break
        }
      }
    } else {
      dayOfPeriod = remainingDays
    }

    // Format output
    const format = asInput
      ? details.format ?? ['year', 'month', 'day']
      : details.outputFormat ?? details.format ?? ['year', 'month', 'day']

    const outputParts = format.map((component) => {
      if (component === 'year') return Math.abs(displayedYear).toString().padStart(4, '0')
      if (component === 'month') return monthName
      if (component === 'day') return dayOfPeriod.toString()
      return '';
    });

    const suffixRaw = displayedYear < 0 ? config.bcSuffix : config.adSuffix
    const suffix = suffixRaw ? ` ${suffixRaw}` : ''
    const prefix = displayedYear < 0 ? '-' : ''

    return prefix + outputParts.filter(Boolean).join(config.delimiter) + suffix
  }
}

// ------------------------------

/*
Step 3: Updating Date Parsing in parseDaysToNonGregorianDateString

In your compiled file (main.js), locate
 parseDaysToNonGregorianDateString(days, config, asInput) and update the year calculation and display formatting as follows:
 */

function parseDaysToNonGregorianDateString(days: number, config: CalendarConfig, asInput: boolean) {

  const details = config.ruleBasedDetails
  if (!details) return `Error: No details found for ${config.id}`

  const noYearZero = !!details.noYearZero // <-- READ NEW YAML SETTING

  const isLeapLocal = (customYear: number) => {
    if (details.leapYearRule?.ruleType === 'gregorian' && typeof config.sharedOffset === 'object') {
      const epochYear = config.sharedOffset.year
      const targetGregorianYear = epochYear + (customYear - 1)
      return isLeapYear(targetGregorianYear)
    }
    return isCustomLeapYear(customYear, details.leapYearRule)
  }

  let remainingDays = days - config.offsetToDayZero
  let year = 1

  if (details.leapYearRule?.ruleType === 'interval' && details.leapYearRule.intervalYears) {
    const interval = details.leapYearRule.intervalYears
    const extra = details.leapYearRule.extraDays ?? 1
    const daysInCycle = details.daysInStandardYear * interval + extra
    if (Math.abs(remainingDays) > daysInCycle) {
      const cycles = Math.floor(remainingDays / daysInCycle)
      year += cycles * interval
      remainingDays -= cycles * daysInCycle
    }
  }

  if (remainingDays > 0) {
    while (true) {
      const isLeap2 = isLeapLocal(year)
      const daysInYear = details.daysInStandardYear + (isLeap2 ? details.leapYearRule?.extraDays ?? 1 : 0)
      if (remainingDays > daysInYear) {
        remainingDays -= daysInYear
        year++
      } else {
        break
      }
    }
  } else {
    while (remainingDays <= 0) {
      year--
      const isLeap2 = isLeapLocal(year)
      const daysInYear = details.daysInStandardYear + (isLeap2 ? details.leapYearRule?.extraDays ?? 1 : 0)
      remainingDays += daysInYear
    }
  }

  // ADJUST DISPLAYED YEAR IF NO YEAR ZERO IS ACTIVE
  let displayedYear = year;
  if (noYearZero && year <= 0) {
    displayedYear = year - 1;
  }

  let monthName = '';
  let dayOfPeriod = 1
  const isLeap = isLeapLocal(year)
  if (details.months?.length > 0) {
    for (let m = 0; m < details.months.length; m++) {
      const monthDef = details.months[m]
      if (!monthDef) break
      let monthDays = monthDef.days
      if (isLeap && details.leapYearRule?.applyToMonthIndex === m) {
        monthDays += details.leapYearRule.extraDays ?? 1
      }
      if (remainingDays > monthDays) {
        remainingDays -= monthDays
      } else {
        monthName = monthDef.shortname ?? monthDef.name ?? String(m + 1)
        dayOfPeriod = remainingDays
        break;
      }
    }
  } else {
    dayOfPeriod = remainingDays
  }

  let format
  if (asInput)
    format = details?.format ?? ['year', 'month', 'day']
  else
    format = details?.outputFormat ?? details?.format ?? ['year', 'month', 'day']

  const outputParts = format.map((component) => {
    if (component === 'year') return Math.abs(displayedYear).toString().padStart(4, '0') // USE displayedYear
    if (component === 'month') return monthName
    if (component === 'day') return dayOfPeriod.toString()
    return ''
  })

  const suffixRaw = displayedYear < 0 ? config.bcSuffix : config.adSuffix // USE displayedYear
  const suffix = suffixRaw ? ` ${suffixRaw}` : ''
  const prefix = displayedYear < 0 ? '-' : '' // USE displayedYear
  return prefix + outputParts.filter(Boolean).join(config.delimiter) + suffix
}

//
// Step 4: Updating YAML Calendar Specification
// Users can now enable noYearZero: true in their frontmatter/YAML calendar definitions:
//
//   YAML
// gantt-calendar-definition: fantasy
// type: rule-based
// offsetToDayZero: 0
// delimiter: '-'
// bcSuffix: 'BC'
// adSuffix: 'AD'
// ruleBasedDetails:
//   noYearZero: true
// daysInStandardYear: 365
// months:
//   - name: 'January'
// days: 31
// - name: 'February'
// days: 28
