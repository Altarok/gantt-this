# FAQ

## Do I need to use the properties the plugin is pre configured with?
For events: **No**. You can change the mapping of all event properties in the settings tab of the plugin.
For calendar: **Yes**

## How do I add a new calendar?
A calendar is added as a note in a directory the settings tab defines. The note needs to have a `gantt-type-definition` frontmatter property which holds the string of the id of the yaml block the calender is defined with in this note. Also the calender needs to be input in the settings tab.

## How do I add an event to a calendar?
An event is added by adding a `gantt-start` and/or `gantt-end` property to the frontmatter of the note. Also it needs to have the `gantt-type` property set to the id of the calender used.
