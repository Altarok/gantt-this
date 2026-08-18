# Settings Tab

### Source Paths

- **`eventPath`**: Folder to search for Gantt event definitions. Can be set to the vault root or a subfolder.
- **`eventPathSearchRecursive`**: Toggle to search `eventPath` recursively (include subfolders).
- **`calendarPath`**: Folder to search for calendar (calendar definition) Markdown files.
- **`calendarPathSearchRecursive`**: Toggle to search `calendarPath` recursively.

### Default Values

- **`defaultCalendar`**: Fallback calendar used when an event does not specify a calendar. Default: `gregorian`.
- **`fallbackColor`**: Default color used for events when no color is provided. Default: `#1565C0`.
- **`fallbackColorForIcons`**: Default icon color when an event has an icon but no icon color. Default: `#FF8800`.

### Calendars

- The `Calendars` list controls which calendar definitions the plugin knows about and how they appear.
- Each calendar entry contains:
  - **`id`**: Calendar identifier (used by frontmatter `gantt-type`/`gantt-type-definition`).
  - **`visible`**: Whether the calendar is shown on the chart.
  - **`color`**: Optional calendar color (used for event coloring or axis coloring when enabled).
  - **`priority`**: Order of appearance on the axis; lower priority appears first.
- Controls in the list: Add a calendar, reorder calendars (sets `priority`), delete a calendar, toggle visibility (
  eye/eye-off), and pick/reset color.

### Groups

- The `Groups` list controls named groupings for events (used to group and color events in lanes).
- Each group entry contains `id`, `visible`, optional `color`, and `priority` for ordering.
- Controls: Add group, reorder, delete, toggle visibility, and pick/reset color.

### Advanced UX Settings

- **`uxDefaultEventSymbol`**: Default symbol for timestamp events. Options: `point`, `box`, `vertical-line`, `diamond`,
  `triangle`, `hexagon`, `pentagon`.
- **`uxAddRibbonIcon`**: Show a ribbon icon in the Obsidian UI to quickly open a live chart preview.
- **`uxAddCommands`**: Add plugin commands (currently work-in-progress / disabled in UI).
- **`mouseOverEventShowBox`**: Show an overlay box around an event when hovered.
- **`mouseOverEventShowVerticalLine`**: Show a vertical line on hover to compare dates.
- **`showButtonsToHideGroups`**: Add toolbar buttons that allow hiding/showing groups individually.
- **`autoRestrictZoom`**: Automatically constrain min/max zoom to reasonable bounds for the current data.
- **`uxOverrideNoteScrollInCalendar`**: When enabled, normal scroll over a calendar zooms; when disabled you must hold
  Shift to zoom.
- **`uxSwitchZoomAndPan`**: Swap the default scroll behavior so that scrolling pans and Ctrl+scroll zooms (toggle to
  switch behavior).
- **`uxUseCalColorForCalAxis`**: Apply calendar color to its axis (may be visually noisy; optional).
- **`uxVerticalLineEventWidth`**: Numeric width for events drawn as vertical lines (slider 1–10).

### Frontmatter Properties

These settings let you adapt the plugin to use different frontmatter keys in your notes.

- **`frontMatterProperty_gantt_this`**: Primary boolean frontmatter key that marks a file as containing Gantt events.
  Default: `gantt-item`.
- **`frontMatterProperty_gantt_this_optional`**: If enabled, the primary marker becomes optional (saves one property per
  file but reduces explicit control).
- **`frontMatterProperty_calendar_name`**: Frontmatter key used to identify a calendar definition file. Default:
  `gantt-type-definition`.
- **`frontMatterProperty_event_calendar`**: Frontmatter key that defines which calendar an event belongs to. Default:
  `gantt-type`.
- **`frontMatterProperty_event_name`**: Frontmatter key for the event name. Default: `gantt-name`.
- **`frontMatterProperty_event_time_start`**: Frontmatter key for the event start date (mandatory). Default:
  `gantt-start`.
- **`frontMatterProperty_event_time_end`**: Frontmatter key for the event end date (optional). Default: `gantt-end`.
- **`frontMatterProperty_event_color`**: Frontmatter key for event color (hex or name). Default: `gantt-color`.
- **`frontMatterProperty_event_group`**: Frontmatter key for the event's group (used to sort and color events). Default:
  `gantt-group`.
- **`frontMatterProperty_event_symbol`**: Frontmatter key to override the event symbol per-event. Default:
  `gantt-symbol`.
- **`frontMatterProperty_event_icon_name`**: Frontmatter key for an icon name (Lucide icons). Default:
  `gantt-displayIcon`.
- **`frontMatterProperty_event_icon_color`**: Frontmatter key for the icon color. Default: `gantt-displayIconColor`.
- **`frontMatterProperty_note_header`**: Frontmatter key for a note-internal header; when set clicking the event will
  navigate to that header instead of top-of-note. Default: `gantt-linkToHeader`.

### Notes & Usage Tips

- Use `Calendars` to register calendar definitions (files that define non-Gregorian calendars). Calendar `id` values are
  used in frontmatter to map events to calendars.
- The `Default valuesV section allows you to set global fallbacks for color and calendar when individual events omit
  them.
- The `Groups` mechanism is useful to build lanes and logical separations for events (for example, locations, factions,
  or categories).
- Advanced UX settings are non-destructive and can be toggled while experimenting with chart behavior.
