import {CalendarConfig} from '../src/const/types'
import {GregorianCalendar} from '../src/const/fallback-calendar'

export const gregorianConfig: CalendarConfig = GregorianCalendar

export const gregorianWithoutMonthsConfig: CalendarConfig = {
  id: 'gregorian-no-months',
  name: 'Gregorian Calendar without months',
  sharedOffset: 0,
  offsetToDayZero: 0,
  type: 'rule-based',
  delimiter: '.',
  ruleBasedDetails: {
    daysInStandardYear: 365,
    leapYearRule: {ruleType: 'gregorian'},
    format: ['year', 'day'],
    months: []
  }
}

export const shireConfig: CalendarConfig = {
  id: 'shire',
  name: 'Shire Reckoning',
  sharedOffset: {year: 0, month: 12, day: 23},
  offsetToDayZero: -8,
  type: 'rule-based',
  delimiter: '-',
  ruleBasedDetails: {
    daysInStandardYear: 365,
    leapYearRule: {
      ruleType: 'interval',
      intervalYears: 4,
      extraDays: 1,
      applyToMonthIndex: 8
    },
    format: ['year', 'month', 'day'],
    months: [
      {name: '2. Yule', days: 1, isIntercalary: true},
      {name: 'Afteryule', days: 30},
      {name: 'Solmath', days: 30},
      {name: 'Rethe', days: 30},
      {name: 'Astron', days: 30},
      {name: 'Thrimidge', days: 30},
      {name: 'Forelithe', days: 30},
      {name: '1. Lithe', days: 1, isIntercalary: true},
      {name: 'Midyear', days: 1, isIntercalary: true},
      {name: '2. Lithe', days: 1, isIntercalary: true},
      {name: 'Wedmath', days: 30},
      {name: 'Halimath', days: 30},
      {name: 'Winterfilth', days: 30},
      {name: 'Blotmath', days: 30},
      {name: 'Foreyule', days: 30},
      {name: '1. Yule', days: 1, isIntercalary: true}
    ]
  }
}

export const mayanConfig: CalendarConfig = {
  id: 'mayan',
  name: 'Mayan Long Count',
  sharedOffset: {year: -3114, month: 8, day: 11},
  offsetToDayZero: -1_137_507,
  type: 'positional',
  delimiter: '.',
  positionalUnits: [
    {name: 'baktun', days: 144000},
    {name: 'katun', days: 7200},
    {name: 'tun', days: 360},
    {name: 'uinal', days: 20},
    {name: 'kin', days: 1}
  ]
}

export const frenchRevolutionConfig: CalendarConfig = {
  id: 'french-revolution',
  name: 'French Revolution',
  sharedOffset: {year: 1792, month: 9, day: 22},
  offsetToDayZero: 654415,
  type: 'rule-based',
  delimiter: '-',
  ruleBasedDetails: {
    daysInStandardYear: 365,
    leapYearRule: {ruleType: 'gregorian', applyToMonthIndex: 12},
    format: ['year', 'month', 'day'],
    months: [
      {name: 'Vendémiaire', days: 30},
      {name: 'Brumaire', days: 30},
      {name: 'Frimaire', days: 30},
      {name: 'Nivôse', days: 30},
      {name: 'Pluviôse', days: 30},
      {name: 'Ventôse', days: 30},
      {name: 'Germinal', days: 30},
      {name: 'Floréal', days: 30},
      {name: 'Prairial', days: 30},
      {name: 'Messidor', days: 30},
      {name: 'Thermidor', days: 30},
      {name: 'Fructidor', days: 30},
      {name: 'leap_days', days: 5, isIntercalary: true}
    ]
  }
}
