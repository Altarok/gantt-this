import {CalendarConfig} from './types'


export const GregorianCalendar: CalendarConfig = {
  id: 'gregorian',
  name: 'Gregorian Calendar',
  displayName: 'Gregorian',
  sharedOffset: 0,
  offsetToDayZero: 0,
  type: 'rule-based',
  delimiter: '-',
  ruleBasedDetails: {
    daysInStandardYear: 365,
    leapYearRule: {ruleType: 'gregorian', applyToMonthIndex: 1},
    format: ['year', 'month', 'day'],
    outputFormat: ['year', 'month', 'day'],
    months: [
      {shortname: 'Jan', name: 'January', days: 31},
      {shortname: 'Feb', name: 'February', days: 28},
      {shortname: 'Mar', name: 'March', days: 31},
      {shortname: 'Apr', name: 'April', days: 30},
      {shortname: 'May', name: 'May', days: 31},
      {shortname: 'Jun', name: 'June', days: 30},
      {shortname: 'Jul', name: 'July', days: 31},
      {shortname: 'Aug', name: 'August', days: 31},
      {shortname: 'Sep', name: 'September', days: 30},
      {shortname: 'Oct', name: 'October', days: 31},
      {shortname: 'Nov', name: 'November', days: 30},
      {shortname: 'Dec', name: 'December', days: 31}
    ]
  },
  moons: [{offset: 18.2, cycle: 29.53059, color: "orange"}],
  bcSuffix: 'BC',
  adSuffix: 'AD'
}
