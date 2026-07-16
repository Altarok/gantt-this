import {beforeEach, describe, expect, it} from 'vitest'
import {Gregorian} from '../src/util/gregorian'
import {CalendarConfig} from '../src/const/types'

const gregorianConfig: CalendarConfig = {
  "id": "iso-8601",
  "name": "Gregorian Calendar",
  "epochGregorian": "0001-01-01",
  "type": "rule-based",
  "delimiter": "-",
  "ruleBasedDetails": {
    "daysInStandardYear": 365,
    "leapYearRule": {
      "ruleType": "gregorian",
      "applyToMonthIndex": 1
    },
    "format": [
      "year",
      "month",
      "day"
    ],
    "months": [
      {
        "name": "January",
        "days": 31
      },
      {
        "name": "February",
        "days": 28
      },
      {
        "name": "March",
        "days": 31
      },
      {
        "name": "April",
        "days": 30
      },
      {
        "name": "May",
        "days": 31
      },
      {
        "name": "June",
        "days": 30
      },
      {
        "name": "July",
        "days": 31
      },
      {
        "name": "August",
        "days": 31
      },
      {
        "name": "September",
        "days": 30
      },
      {
        "name": "October",
        "days": 31
      },
      {
        "name": "November",
        "days": 30
      },
      {
        "name": "December",
        "days": 31
      }
    ]
  }
}

const shireConfig: CalendarConfig = {
  "id": "shire",
  "name": "Shire Reckoning",
  "epochGregorian": "0001-01-01",
  "type": "rule-based",
  "delimiter": "-",
  "ruleBasedDetails": {
    "daysInStandardYear": 365,
    "leapYearRule": {
      "ruleType": "interval",
      "intervalYears": 4,
      "extraDays": 1,
      "applyToMonthIndex": 8
    },
    "format": [
      "year",
      "month",
      "day"
    ],
    "months": [
      {
        "name": "2. Yule",
        "days": 1,
        "isIntercalary": true
      },
      {
        "name": "Afteryule",
        "days": 30
      },
      {
        "name": "Solmath",
        "days": 30
      },
      {
        "name": "Rethe",
        "days": 30
      },
      {
        "name": "Astron",
        "days": 30
      },
      {
        "name": "Thrimidge",
        "days": 30
      },
      {
        "name": "Forelithe",
        "days": 30
      },
      {
        "name": "1. Lithe",
        "days": 1,
        "isIntercalary": true
      },
      {
        "name": "Midyear",
        "days": 1,
        "isIntercalary": true
      },
      {
        "name": "2. Lithe",
        "days": 1,
        "isIntercalary": true
      },
      {
        "name": "Wedmath",
        "days": 30
      },
      {
        "name": "Halimath",
        "days": 30
      },
      {
        "name": "Winterfilth",
        "days": 30
      },
      {
        "name": "Blotmath",
        "days": 30
      },
      {
        "name": "Foreyule",
        "days": 30
      },
      {
        "name": "1. Yule",
        "days": 1,
        "isIntercalary": true
      }
    ]
  }
}



describe('Parse days to date format', () => {

  beforeEach(() => {
    // alg1FRU = createAlgorithm(['F', 'R', 'U'])
    // alg2FLU = createAlgorithm(['F', 'L', 'U'])
  })

  it('gregorian', () => {
    expect(Gregorian.parseDaysToGregorianDateString(1, gregorianConfig)).toBe('0001-01-01')
  })

  it('shire', () => {
    expect(Gregorian.parseDaysToNonGregorianDatString(1, shireConfig)).toBe('1-2. Yule-1')
  })

})
