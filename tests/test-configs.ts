import {CalendarConfig} from '../src/const/types'

export const gregorianConfig: CalendarConfig = {
  'id': 'gregorian',
  'name': 'Gregorian Calendar',
  'epochGregorian': '0001-01-01',
  'type': 'rule-based',
  'delimiter': '-',
  'ruleBasedDetails': {
    'daysInStandardYear': 365,
    'leapYearRule': {
      'ruleType': 'gregorian',
      'applyToMonthIndex': 1
    },
    'format': [
      'year',
      'month',
      'day'
    ],
    'months': [
      {
        'name': 'January',
        'days': 31
      },
      {
        'name': 'February',
        'days': 28
      },
      {
        'name': 'March',
        'days': 31
      },
      {
        'name': 'April',
        'days': 30
      },
      {
        'name': 'May',
        'days': 31
      },
      {
        'name': 'June',
        'days': 30
      },
      {
        'name': 'July',
        'days': 31
      },
      {
        'name': 'August',
        'days': 31
      },
      {
        'name': 'September',
        'days': 30
      },
      {
        'name': 'October',
        'days': 31
      },
      {
        'name': 'November',
        'days': 30
      },
      {
        'name': 'December',
        'days': 31
      }
    ]
  }
}

export const shireConfig: CalendarConfig = {
  'id': 'shire',
  'name': 'Shire Reckoning',
  'epochGregorian': '0000-12-23',
  'type': 'rule-based',
  'delimiter': '-',
  'ruleBasedDetails': {
    'daysInStandardYear': 365,
    'leapYearRule': {
      'ruleType': 'interval',
      'intervalYears': 4,
      'extraDays': 1,
      'applyToMonthIndex': 8
    },
    'format': [
      'year',
      'month',
      'day'
    ],
    'months': [
      {
        'name': '2. Yule',
        'days': 1,
        'isIntercalary': true
      },
      {
        'name': 'Afteryule',
        'days': 30
      },
      {
        'name': 'Solmath',
        'days': 30
      },
      {
        'name': 'Rethe',
        'days': 30
      },
      {
        'name': 'Astron',
        'days': 30
      },
      {
        'name': 'Thrimidge',
        'days': 30
      },
      {
        'name': 'Forelithe',
        'days': 30
      },
      {
        'name': '1. Lithe',
        'days': 1,
        'isIntercalary': true
      },
      {
        'name': 'Midyear',
        'days': 1,
        'isIntercalary': true
      },
      {
        'name': '2. Lithe',
        'days': 1,
        'isIntercalary': true
      },
      {
        'name': 'Wedmath',
        'days': 30
      },
      {
        'name': 'Halimath',
        'days': 30
      },
      {
        'name': 'Winterfilth',
        'days': 30
      },
      {
        'name': 'Blotmath',
        'days': 30
      },
      {
        'name': 'Foreyule',
        'days': 30
      },
      {
        'name': '1. Yule',
        'days': 1,
        'isIntercalary': true
      }
    ]
  }
}

export const mayanConfig: CalendarConfig = {
  'id': 'mayan',
  'name': 'Mayan Long Count',
  'epochGregorian': '-003113-08-12', /* -1,137,141 */
  'type': 'positional',
  'delimiter': '.',
  'positionalUnits': [
    {
      'name': 'baktun',
      'days': 144000
    },
    {
      'name': 'katun',
      'days': 7200
    },
    {
      'name': 'tun',
      'days': 360
    },
    {
      'name': 'uinal',
      'days': 20
    },
    {
      'name': 'kin',
      'days': 1
    }
  ]
}
