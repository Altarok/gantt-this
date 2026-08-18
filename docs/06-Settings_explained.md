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

- **Event symbol**: Default symbol for timestamp events.
  - Options: `point`, `triangle`, `box`, `diamond`, `pentagon`, `hexagon`, `octagon`, `star` and
    `vertical-line`.
- **Add ribbon icon**: Show a ribbon icon in the Obsidian UI to quickly open a live chart preview.
- **Add plugin commands**: Add plugin commands (currently work-in-progress / disabled in UI).
- **Show overlay box**: Show an overlay box around an event when hovered.
- **Show overlay vertical line**: Show a vertical line on hover to compare dates.
- **Group visibility toggles**: Add toolbar buttons that allow hiding/showing groups individually.
- **Restrict minimum and maximum zoom**: Automatically constrain min/max zoom to reasonable bounds for the current data.
  - Minimum zoom would fit your complete dataset on the screen.
  - Maximum zoom would show adjacent days.
- **Zoom key**: Key to hold while scrolling to zoom in or out.
- **Pan key**: Key to hold while scrolling to pan horizontally.
  - Both options offer Ctrl, Alt, and Shift. (Ctrl, Option, Shift on MacOS)
- **Color-code calendar axis**: Apply calendar color to its axis (may be visually noisy; optional).
- **Vertical line event width**: Numeric width, in pixels, for events drawn as vertical lines (slider 1–10).

### Frontmatter Properties

These settings let you adapt the plugin to use different frontmatter keys in your notes.

- **Gantt event marker**: Primary boolean frontmatter key that marks a file as containing Gantt events.
  Default: `gantt-item`.
- **Marker may be optional**: If enabled, the primary marker becomes optional (saves one property per
  file but reduces explicit control).
- **Calendar definition**: Frontmatter key used to identify a calendar definition file. Default:
  `gantt-type-definition`.
- **Event calendar**: Frontmatter key that defines which calendar an event belongs to. Default:
  `gantt-type`.
- **Event name**: Frontmatter key for the event name. Default: `gantt-name`.
- **Event start date**: Frontmatter key for the event start date (mandatory). Default:
  `gantt-start`.
- **Event end date**: Frontmatter key for the event end date (optional). Default: `gantt-end`.
- **Event color**: Frontmatter key for event color (hex or name). Default: `gantt-color`.
- **Event group**: Frontmatter key for the event's group (used to sort and color events). Default: `gantt-group`.
- **Event symbol**: Frontmatter key to override the event symbol per-event. Default: `gantt-symbol`.
- **Event icon**: Frontmatter key for an icon name (Lucide icons). Default: `gantt-displayIcon`.
- **Event icon color**: Frontmatter key for the icon color. Default: `gantt-displayIconColor`.
- **Target header**: Frontmatter key for a note-internal header; when set clicking the event will
  navigate to that header instead of top-of-note. Default: `gantt-linkToHeader`.

### Notes & Usage Tips

- Use `Calendars` to register calendar definitions (files that define non-Gregorian calendars). Calendar `id` values are
  used in frontmatter to map events to calendars.
- The `Default values` section allows you to set global fallbacks for color and calendar when individual events omit
  them.
- The `Groups` mechanism is useful to build lanes and logical separations for events (for example, locations, factions,
  or categories).
- Advanced UX settings are non-destructive and can be toggled while experimenting with chart behavior.
