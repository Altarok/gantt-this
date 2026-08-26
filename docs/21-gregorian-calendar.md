---
title: Gregorian Calendar
order: 21
---

Back to [calendar examples](20-example-calendars).

# Gregorian Calendar

The global standard Earth time-tracking profile using true dynamic leap-year calculations.
Includes 365 days, 366 in leap years, 1 moon, 12 months of different lengths, and more.

````markdown
---
gantt-calendar-definition: gregorian
---

```yaml
id: gregorian               # mandatory. unique ID of this calendar, referenced by events
name: Gregorian Calendar    # optional name, used as axis description if `displayName` is not given  
displayName: Gregorian      # optional display name for axis description
sharedOffset: 0             # used to define offset between calendars
type: "rule-based"          # mandatory. just keep this like that, see Mayan calendar for alternative
delimiter: "-"              # mandatory. symbol used to separate your days/months/years 
ruleBasedDetails:
  daysInStandardYear: 365   
  leapYearRule:                                        # optional leap year rule
    ruleType: "gregorian"                              # Triggers the divisible by 4, but not 100 unless 400 math - alteratives are 'interval' | 'none'
    applyToMonthIndex: 1                               # February. first month has index 0 in this case
    extraDays: 1                                       # optional. defaults to 1 anyway
  format: ["year", "month", "day"]                     # mandatory. order of elements in date input (and possibly output)
  outputFormat: ["day", "month", "year"]               # optional. defines order of elements in display date
  months:                                              # list of months
    - {shortname: "Jan", name: "January", days: 31}    # shortname is optional ...
    - {shortname: "Feb", name: "February", days: 28}   # name is optional ...
    - {shortname: "Mar", name: "March", days: 31}      # days is mandatory
    - {shortname: "Apr", name: "April", days: 30}      
    - {shortname: "May", name: "May", days: 31}
    - {shortname: "Jun", name: "June", days: 30}
    - {shortname: "Jul", name: "July", days: 31}
    - {shortname: "Aug", name: "August", days: 31}
    - {shortname: "Sep", name: "September", days: 30}
    - {shortname: "Oct", name: "October", days: 31}
    - {shortname: "Nov", name: "November", days: 30}
    - {shortname: "Dec", name: "December", days: 31}
moons:                                                 # optional list of moons
  - {offset: 18.2, cycle: 29.53059, color: "orange"}         # offset is the index of a day with a new moon, offset+-cycle are other new moons
bcSuffix: 'BC'                                         # optional date suffix for dates before day 1 
adSuffix: 'AD'                                         # optional date suffix for dates after (and including) day 1 
```
````

Last change: 2026-08-26
