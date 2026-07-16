// import {beforeEach, describe, expect, it} from 'vitest'
import {Gregorian} from '../src/util/gregorian'
import {CalendarConfig} from '../src/const/types'

const gregorianConfig : CalendarConfig = {
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


// describe('Algorithm', () => {
//
//   beforeEach(() => {
//     // alg1FRU = createAlgorithm(['F', 'R', 'U'])
//     // alg2FLU = createAlgorithm(['F', 'L', 'U'])
//   })
//
//   it('should create distinct hash values on creation', () => {

const s = Gregorian.parseDaysToGregorianDateString( 1 , gregorianConfig );

console.log (s)

// expect (s).toBe('1-1-1')


//   })
//
// })
