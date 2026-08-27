---
title: Change log
order: 91
---

# Changelog

See [[90-roadmap|Roadmap]] for upcoming features.

> Disclaimer: The mentioned frontmatter properties represent their default keys;
> you may have renamed them in your vault.

## [v1.2.1](https://github.com/Altarok/gantt-this/releases/tag/1.2.1), 2026-08-26

- _Timestamp events now have text descriptions._
- Added command which adds all missing Gantt properties to the current file (matching your renamed property keys)
- Settings:
  - Default calendar selection goes from `text` to `dropdown`
  - Default group selection added, also `dropdown`
  - You can no longer delete the default group/calendar
- Add fallback implementation for Gregorian calendar

## [v1.2.0](https://github.com/Altarok/gantt-this/releases/tag/1.2.0), 2026-08-26

- Added predecessors and successors to event properties. Optional list properties
  - Added option to *highlight related events*
  - Added option to *connect related events with directional arrows*
- Added cooldown to re-rendering of Gantt chart. Set it to anything from 0 to 30 seconds.
- Bases: add new setting to the base itself to be able to use lower and upper bound date with fantasy calendar instead
  of `gregorian`.
- ~~Optional: Use filename as fallback for event start date. Useful for daily notes.~~ Disabled in v1.2.1.

**Other**

- Settings: Split `Add ribbon icon` into 2 options; 1 for desktop, 1 for mobile
- CSS: Changed text and arrow color depending on theme

## [v1.1.8](https://github.com/Altarok/gantt-this/releases/tag/1.1.8), 2026-08-22

- Place timestamp events with symbol `vertical-line` in their respective group vertically (like eras)

**Bugfix**

- Add default color to event icons

## [v1.1.7](https://github.com/Altarok/gantt-this/releases/tag/1.1.7), 2026-08-21

- Add optional suffix to descriptive date: "today +-X"
  - X gets interpreted as days for now, more options to come
- Sort and cleanup plugin settings
  - New setting: hide moons
  - New setting: choose color for hover effect
- Random color for new groups and calendars

## [v1.1.6](https://github.com/Altarok/gantt-this/releases/tag/1.1.6), 2026-08-19

- *Bases*: Improved layout of custom tooltip - define what you want to see
- *Bases*: Show file preview when hovering while holding CTRL
  - Key will be configurable in the next update
- Move vertical hover overlay of events to **behind** event symbols
- Improve naming of frontmatter property names related to calendars

## [v1.1.5](https://github.com/Altarok/gantt-this/releases/tag/1.1.5), 2026-08-18

- **Bases feature**: Improved tooltip layout in bases
  - The tooltip title prefix `Day:xyz` prefix is gone

**Bugfix**

- Fix overlay and click reaction of point events

## [v1.1.4](https://github.com/Altarok/gantt-this/releases/tag/1.1.4), 2026-08-18

- **Bases feature**: Selected properties will appear in event tooltip
- **Official documentation**: https://altarok.github.io/gantt-this/

**Bugfix**

- End-date property no longer ignored

## [v1.1.3](https://github.com/Altarok/gantt-this/releases/tag/1.1.3), 2026-08-18

- New plugin Settings lets you decide which button to use while scrolling to zoom / pan.
  - With this you will be able to just scroll over a chart without breaking the scroll
- General grammar and description improvements

## [v1.1.2](https://github.com/Altarok/gantt-this/releases/tag/1.1.2), 2026-08-17

- Bugfix: Add missing overlay for new icons 'star' and 'octagon'

## [v1.1.1](https://github.com/Altarok/gantt-this/releases/tag/1.1.1), 2026-08-17

- *__Includes Bases__* in the most basic version. You will be able to do the following:
- Use bases to see your fantasy Gantt charts. This comes with
  - Have all your charts in 1 file
  - Manually select which folders to use for your events
    - Filter `file` `in folder` `foo/bar` to see events in this folder __**including**__ sub-folders
    - Filter `folder` `is` `foo/bar` to see events in this folder __**not including**__ sub-folders
  - Set up a lower and upper date range for each chart individually (which will reference your default calendar)
  - See the amount of found events in the top-left corner
- Stars and octagons are available
- Release done because the last one failed due to GitHub hickup. This should have been 1.1.0

## [v1.0.3](https://github.com/Altarok/gantt-this/releases/tag/1.0.3), 2026-08-16

- Add setting for default event symbol
- Calendars now may contain an optional outputFormat (to display dates differently from input format in event notes)
- A year-only date is now a valid option
  - Points to January 1st for now, a setting will allow to interpret it as a 1-year timespan

**Bugfixes**

- Move minus for negative years to front of date (was fixed to year before)
- Calendars no longer have to be lowercase only, this also applies to groups

## [v1.0.2](https://github.com/Altarok/gantt-this/releases/tag/1.0.2), 2026-08-14

- Setting: Makes `gantt-item` checkbox optional.
  - If active, this saves you 1 frontmatter property per event, but gives less control.
- Make descriptive date `"today"` work for non-Gregorian calendars, for code-blocks.

**Bugfix**

- Default calendar now works (calendar must be defined in list below)

## [v1.0.1](https://github.com/Altarok/gantt-this/releases/tag/1.0.1), 2026-08-14

- Improved grammar in settings, removed typos.
- "today" is now a valid date for events -> This enables you to:
  - Mark the current day with something (e.g. `vertical-line` event)
  - Define an event with an open end (start: x, end: `today`)
    - Gregorian only for now

**Bugfix**

- Moons are back

## [v1.0.0](https://github.com/Altarok/gantt-this/releases/tag/1.0.0), 2026-08-13

- Improved *mobile support* with touch events.
- Added panning with CTRL key (Win + MacOS).
- Added n-cornered shapes function and added triangle and hexagon as displayTypes by @CePeU
  - Added n-shaped overlays
- Added pentagon as symbol type and fixed hexagon and diamond classes by @CePeU
- Added start- and end days for calendars. They can end now instead of going forever.
- Added attribute 'displayName' to events and calendars. Use `""` to not show any name.
- Added optional post-scriptum for calendar dates ("BC"/"AD").
- Settings
  - Make zoom and pan controls switchable
  - Add ribbon icon

**Bugfixes**

- Tooltip was in wrong place when chart note was popped out of Obsidian.
- Wider screens now zoom and pan better.

## [v0.5.3](https://github.com/Altarok/gantt-this/releases/tag/0.5.3), 2026-08-10

- Added intelligent minimum and maximum for zoom.
- Added code block content parsing:
  - Added lower and upper bound ranges for initial view via code block.
  - Added center date for initial focus via code block.
- Shorten mouse overlay lines to only be visible above related calendar.
- Added optional list of moons; including color, offset and cycle

## [v0.5.2](https://github.com/Altarok/gantt-this/releases/tag/0.5.2), 2026-08-07

- Added new event type `vertical-line`.
- Added text to `era` events.
- Moved `era` and `vertical-line` events behind others.
- Automated text and icon removal while zooming.
- Added optional icons for all events (except `vertical-line`).
- Automated number of dates on screen.
- Allow calendars without months.
- Added optional calendar `displayName` - will get shown as axis description.

**Other**

- Code - refactor SVG creation

## [v0.5.1](https://github.com/Altarok/gantt-this/releases/tag/0.5.1), 2026-08-04

- New Contributor: `CePeU`
  - Small fix of group icon and settings description by @CePeU
- Added colored eras.
- Fixed offset calculation for calendar definitions.
- Added short name property of calendar months.
- Show dates in tooltips with human-readable month names, uses short name if given.

## [v0.5.0](https://github.com/Altarok/gantt-this/releases/tag/0.5.0), 2026-07-31

Adapt to new Obsidian settings (version 1.13+).

## [v0.4.1](https://github.com/Altarok/gantt-this/releases/tag/0.4.1), 2026-07-28

- Changed width of code block creator modal to 90%.
- Added setting: Show row of buttons at the end of toolbar to toggle group visibility.
- Overhaul German version of README.

## [v0.4.0](https://github.com/Altarok/gantt-this/releases/tag/0.4.0), 2026-07-28

- Added text description to bar events.
- Added new timestamp event symbol: `diamond`
- Added optional icons to timestamp events.
- Added frontmatter property to let you link to in-note header.
- Added highlight to hovered events.

## [v0.3.0](https://github.com/Altarok/gantt-this/releases/tag/0.3.0), 2026-07-28

- Added group priority sorting.
- Added group visibility toggle.

## [v0.2.7](https://github.com/Altarok/gantt-this/releases/tag/0.2.7), 2026-07-27

**Bugfix**: Changed order of DOM elements in settings view.

## [v0.2.6](https://github.com/Altarok/gantt-this/releases/tag/0.2.6), 2026-07-27

Remove typo.

## [v0.2.5](https://github.com/Altarok/gantt-this/releases/tag/0.2.5), 2026-07-27

Group definitions now optional in settings.

## [v0.2.4](https://github.com/Altarok/gantt-this/releases/tag/0.2.4), 2026-07-27

- Sort groups and calendars in settings.
- Added shortcut to settings.

## [v0.2.3](https://github.com/Altarok/gantt-this/releases/tag/0.2.3), 2026-07-24

Remove hard-coded min & max zoom.

## [v0.2.2](https://github.com/Altarok/gantt-this/releases/tag/0.2.2), 2026-07-24

Bugfix: Release done because of version mismatches.

## [v0.2.1](https://github.com/Altarok/gantt-this/releases/tag/0.2.1), 2026-07-24

Added reload button to Gantt chart.

## [v0.2.0](https://github.com/Altarok/gantt-this/releases/tag/0.2.0), 2026-07-24

Added mobile support via buttons for zooming and panning.

## [v0.1.0](https://github.com/Altarok/gantt-this/releases/tag/0.1.0), 2026-07-22

Initial release for testing.
