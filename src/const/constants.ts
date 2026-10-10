export const Css = {
  wrapper: 'gt-main-container',
  toolbar: {
    container: 'gt-toolbar-container',
    minimized: 'gt-toolbar-minimized',
    buttonGroup: 'gt-toolbar-buttongroup', /* Reduces horizontal space between buttons */
    button: 'gt-toolbar-button', /* Button and SVG sizes */
    separator: 'gt-toolbar-separator', /* Separates button groups */
  },
  inputLabel: 'gt-input-label',
  chartContainer: 'gt-chart-container',
  axis: {
    /** Use for calendar axis baseline */
    baseline: 'gt-axis-baseline',
    /** Use for calendar axis gridline */
    gridline: 'gt-axis-gridline',
    label: 'gt-axis-label',
    labelBadge: 'gt-axis-label-badge',
    text: 'gt-axis-text',
    tick: 'gt-axis-tick',
    tickMinor: 'gt-axis-tick-minor',
  },
  item: {
    /** Base CSS class event SVGs */
    item: 'gt-item',
    /** Use for all timestamp event shapes that do not require CSS */
    timestamp: 'gt-item timestamp',
    /** Use for box events */
    box: 'gt-item timestamp box',
    /** Use for bar events */
    bar: 'gt-item timespan bar',
    /** Use for era events */
    era: 'gt-item timespan era',

    /** Use for all texts on timestamp events */
    textTimestamp: 'gt-item text-timestamp',
    /** Use for all texts on bar events */
    textBar: 'gt-item text-bar',
    /** Use for all texts on era events */
    textEra: 'gt-item text-era',
  },
  itemLayer: {
    era: 'gt-layers-eras',
    repeater: 'gt-layers-repeaters',
  },
  group: {
    text: 'gt-group-text',
    badge: 'gt-group-badge',
    rowEven: 'gt-group-row-even',
    rowOdd: 'gt-group-row-odd',
  },
  hover: {
    highlightHoveredEvent: 'gt-item symbol-hover', /* Highlight on hovered event */
    highlightRelatedEvent: 'gt-item symbol-hover-related' /* Highlight on events related to hovered event */
  },
  tooltip: {
    tooltip: 'gt-tooltip', /* Use for tooltip */
    title: 'gt-tooltip-title',  /* Use for tooltip title */
    table: 'gt-tooltip-table', /* Use for tooltip table */
    repeaterSuffix: 'gt-tooltip-repeat-dates', /* Use for tooltip table */
    link: 'gt-tooltip-link' /* Use for tooltip link to related note */
  },
  settings: {
    container: 'gt-settings-container',
    row: 'gt-settings-row',
    list: 'gt-settings-list',
    itemDescription: 'gt-settings-item-description',
    calendarControl: 'gt-settings-visibility-list',
    emptyNotice: 'gt-settings-empty-notice'
  },
  svg: {
    canvas: 'gt-svg-canvas',
  },
  /* obsidian native classes */
  theme: {
    dark: 'theme-dark',
    light: 'theme-light',
  },
  /* obsidian native classes */
  modWarning: 'is-destructive',

} as const

export const svgUrl = 'http://www.w3.org/2000/svg'

/**
 * Splits given string, but only at first appearance of the separator.<br>
 * Call like this:
 * <code>const {left: key, right: value} = StringUtils.splitOnce(line, ':')</code><br>
 * If the separator isn't found, returns the whole string as 'left' and an empty 'right'
 * @param splitMe string to be split
 * @param separator
 * @return <code>{left:string, right:string}</code>. Every returned value is trimmed.
 */
export function splitOnce(splitMe: string, separator: string): { left: string, right: string } {
  const index = splitMe.indexOf(separator)
  if (index === -1) {
    return {left: splitMe.trim(), right: ''}
  }
  const left = splitMe.slice(0, index).trim()
  const right = splitMe.slice(index + 1).trim()
  return {left, right}
}

/**
 * Magic numbers
 */
export const Consts = {
  // DAYS_FROM_1_1_1_TO_1_1_1970: 719162, //  = days between 1-1-1 (day 1) and 1970-1-1
  CODEBLOCK_ID: 'gantt-this',
  DAYS_FROM_0_12_31_TO_1_1_1970: 719163, //  = days between 0-12-31 (day 0) and 1970-1-1
  MILLIS_IN_1_DAY: 86_400_000, // = 24 * 60 * 60 * 1000
  ROOT_PATH: '/',
  ROOT_PATH_NORMALIZED: '',
  DIR_SEPARATOR: '/',
  AXIS_TICK_DIFF_TO_HIDE_DAYS: 365,
  AXIS_TICK_DIFF_TO_HIDE_MONTHS: 730,
} as const
