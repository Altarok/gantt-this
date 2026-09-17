---
title: DSA TTRPG Calendar
order: 23
---

# The Dark Eye (DSA) TTRPG Calendar

````markdown
---
gantt-calendar-definition: tde
---

```yaml
id: tde                        # mandatory. unique ID for each calendar, referenced by events
name: The Dark Eye Calendar    # optional name, used as axis description if `displayName` is not given  
displayName: TDE               # optional display name for axis description
sharedOffset: 0                # used to define offset between calendars
startDay: 1
type: rule-based               # mandatory.
delimiter: "-"                 # mandatory. symbol used to separate your days/months/years 
ruleBasedDetails:
  daysInStandardYear: 365      # self-explanatory
  format:                      # optional. date input format, as read in event notes
    - "year"
    - "month"
    - "day"
  outputFormat:                # optional. defines order of elements in dates displayed on Gantt chart
    - "day"
    - "month"
    - "year"
  months: 
    - name: Praios
      days: 30
    - name: Rondra
      days: 30
    - name: Efferd
      days: 30
    - name: Travia
      days: 30
    - name: Boron
      days: 30
    - name: Hesinde
      days: 30
    - name: Firun
      days: 30
    - name: Tsa
      days: 30
    - name: Phex
      days: 30
    - name: Peraine
      days: 30
    - name: Ingerim
      days: 30
    - name: Rahja
      days: 30
    - name: Nameless
      days: 5
moons:                         # optional list of moons
   - {offset: 10, cycle: 28, color: "#928440"}
```
````
