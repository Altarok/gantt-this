---
title: Roadmap
order: 90
---

# Roadmap

See [Changelog](91-changelog) for implemented features.
Last change: 2026-08-26

> The following list is not exhaustive. It contains only features confirmed for implementation.
> See below for a shorthand list of unsorted ideas.

## Features to come, by priority

> Disclaimer: The mentioned frontmatter properties represent their default keys;
> you may have renamed them in your vault.

- Recurring events. - CePeU and others
- Keep calendar axis visible while scrolling over the chart.
- Keep toolbar visible while scrolling over the chart.
- Apply the calendar's optional `outputFormat` property to tooltip dates. - CePeU
- Change the frontmatter properties `gantt-calendar` and `gantt-group` from `text` to `list`.
- Zoom:
  - Hide smallest date format elements consecutively while zooming out.
  - Focus shown dates on more natural periods.
  - Set a safe default zoom and restore it when re-opening files.
- Calendars:
  - Add a manually configurable leap year rule. - CePeU
  - Add `YyWwDd format`. - CePeU
  - Remove duplicate calendar ID definition in calendar notes.
  - Rename `rule-based`.
- Highlight weekends.
- Manage rerender cooldown depending on the content of the changed file. - CePeU
- Add a setting for the time difference between calendar axis ticks. - Charatzu
- Make data exportable for use in other plugins. - CePeU

## Unsorted ideas

- In-plugin CSS themes.
- Calendars:
  - Add format without days.
  - Add seasons.
  - Add quarters.
  - Add format without years.
- Select groups and calendars on a per-chart basis (doable with base filters) in code-block charts. - CePeU
- Moon-only calendar. - CePeU
- Settings:
  - Join tooltip-related settings.
  - Use CLI to rename properties vault-wide when renaming Gantt properties.
- Add event symbol suffixes for chainable symbols. - CePeU
- Prevent duplicate events on the chart. - CePeU
- Add time of day to events, not only dates. - CePeU
- Add right-click context menu.
  - What to add to it?
- Allow events to open a canvas or base when clicked. - CePeU
- Allow events to open other Gantt charts when clicked. - CePeU
- Allow differing day lengths across calendars.
