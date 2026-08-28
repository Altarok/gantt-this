---
title: FAQ
order: 99
---

# FAQ

## Do I need to use the properties the plugin is pre-configured with?

For events: **No**. You can change the mapping of all event properties in the settings tab of the plugin.

## How do I add a new calendar?

A calendar is added as a note in a directory defined by the plugin's settings. The note needs to have a
`gantt-calendar-definition`
frontmatter property which holds the ID string of the YAML block defining the calendar. Additionally, the calendar must
be added to the plugin's settings.

## How do I add an event to a calendar?

An event is added by adding a `gantt-start` (and optionally `gantt-end`) property to the frontmatter of the note. It
must also have the `gantt-calendar` property set to the ID of your target calendar.
