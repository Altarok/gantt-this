---
title: Calendar Definitions
order: 3
---

# Calendar properties

## Calendar Frontmatter Properties

If you use custom time systems or fictional calendars in your vault, you can define them using a separate note:

| Property                | Type / Values | Optional? | Default / Fallback | Description                                                                     |
|:------------------------|:--------------|:----------|:-------------------|:--------------------------------------------------------------------------------|
| `gantt-type-definition` | String        | **No**    | *None*             | Unique identifier of the calendar for referencing via `gantt-type` in an event. |

## Calendar YAML Block Properties

- **`id`**: (string, required) Unique identifier for the calendar. Used by events `gantt-type` to reference this
  calendar.
- **`name`**: (string, optional) Human-friendly internal name for the calendar.
- **`displayName`**: (string, optional) Display name shown in the UI (if different from `name`).
- **`sharedOffset`**: (epoch offset definition, required) Defines the calendar's epoch offset. Can be either a single
  integer offset (days from reference day zero) or an object `{ year: number, month: number, day: number }` to describe
  the epoch relative to the plugin's reference. The plugin converts this to an internal numeric offset to day zero.
  Irrelevant if you use only one calendar.
- **`startDay`**: (epoch offset definition, optional) Start date for this calendar; converted to a numeric
  offset for range checks.
- **`endDay`**: (epoch offset definition, optional) End date for this calendar; converted to a numeric offset
  for range checks.
- **`offsetToDayZero`**: (number, calculated) Not usually set by users — the plugin writes/calculates this value when
  reading the calendar from YAML. It represents days offset to the plugin's internal day-zero.
- **`type`**: (string, required) Calendar type. Supported values: `positional`, `rule-based`, `gregorian`. Determines
  which additional keys are required:
  - `positional`: Calendar defined by ordered positional units (e.g., seasons, boles). Use `positionalUnits`.
  - `rule-based` / `gregorian`: Use `ruleBasedDetails` to describe months, leap rules, and formats.
- **`delimiter`**: (string, optional) Separator used in textual date representations (for example `-` in
  `1420-Afterlithe-21`).
- **`positionalUnits`**: (array of objects, positional type only) Each unit is `{ name: string, days: number }`. Use for
  calendars that specify named positions with fixed day lengths rather than month/day rules.
- **`ruleBasedDetails`**: (object, rule-based/gregorian only) Contains details for month names, leap-year handling, and
  formatting:
  - **`months`**: array of month objects `{ name: string, shortname?: string, days: number, isIntercalary?: boolean }`
    describing month order and lengths. `isIntercalary` marks days that do not belong to any month (e.g., Yule days).
  - **`leapYearRule`**: object
    `{ ruleType: 'gregorian'|'interval'|'none', intervalYears?: number, extraDays?: number, applyToMonthIndex?: number }`
    describing how leap days are applied. `interval` with `intervalYears` adds every N years; `gregorian` uses the
    Gregorian exceptions; `none` disables leap days.
  - **`daysInStandardYear`**: integer, number of days in a normal year for this calendar (used for calculations).
  - **`format`**: array of date components `['year','month','day','intercalary']` describing how dates are written and
    parsed for this calendar (order of elements).
  - **`outputFormat`**: optional array like `format` to control how the plugin displays parsed dates (if omitted,
    `format` is used).
- **`bcSuffix` / `adSuffix`**: (string, optional) Suffixes to use for BC/AD labels if the calendar prints era markers.
- **`moons`**: (array of objects, optional) For lunar cycles: each moon is
  `{ offset: number, cycle: number, color?: string }` where `offset` shifts the phase, `cycle` is the length in days,
  and `color` is used for display.

### Notes on Types and Parsing

- Epoch offsets (`sharedOffset`, `startDay`, `endDay`) may be provided as a single integer (days) or as a
  `{ year, month, day }` object; the plugin converts them to absolute day offsets.
- `ruleBasedDetails.months` must sum sensibly to `daysInStandardYear` (except when intercalary days exist).
- Use `isIntercalary` for festival days or year-day elements that do not belong to a month; these are represented as
  separate elements in the calendar format.

