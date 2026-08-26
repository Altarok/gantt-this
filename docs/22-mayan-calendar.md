---
title: Mayan Calendar
order: 22
---

Back to [calendar examples](20-example-calendars).

# Mayan Calendar

While the world didn't end in 2012, this calendar did. The Maya did not count years, but phases of different length.
One of these was 360 days long—close to a solar year. They did not use leap days.

````markdown
---
gantt-calendar-definition: mayan
---

```yaml
id: mayan
name: Mayan Long Count
displayName: Mayan
sharedOffset:
  year: -3114              # the Mayan calendar started on a Sunday in the year -3114 (Gregorian) ...
  month: 8                 # in August ...
  day: 11                  # ... 11. Alternatively use: "sharedOffset: -1137507" which is the same day, nut less readable
type: "positional"         # Defines that this calendar is based on stacked elements
delimiter: "."             # Those stacked elements get joined by a dot
positionalUnits:           # Mandatory when type equals "positional" 
  - name: "baktun"         # While nobody knows for sure, scientists assume this was the Mayan name for ...
    days: 144000           # ... the biggest period which has 144000 days
                           # Range: 0-19 (Though dynamically unconstrained as the highest traditional tier)
  - name: "katun"          # Katun, another time period with 7200 days 
    days: 7200             # Range: 0-19 (20 katuns = 1 baktun)
  - name: "tun"            # Tun, 360 days
    days: 360              # Range: 0-19 (20 tuns = 1 katun)
  - name: "uinal"          # Uinal, 20 days
    days: 20               # Range: 0-17 (18 uinals = 1 tun — Note: This is the solar adjustment tier!)
  - name: "kin"            # Kin, literally 1 day, 
    days: 1                # Range: 0-19 (20 kins = 1 uinal)
moons:                     # optional moon, totally irrelevant for the calendar
  - {offset: 18.2, cycle: 29.53059, color: "#0000CC"}

```
````

Last change: 2026-08-26
