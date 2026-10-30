export const CustomIcons = {
  resetZoom: 'gt-custom-resetPanAndZoom',
  barChartCrossed: 'customBarChartCrossed',
  scatterChart: 'customScatterChart',
  scatterChartCrossed: 'customScatterChartCrossed',
  groupCrossed: 'customGroupCrossed'
} as const

/**
 * Central directory of all CSS classes
 */
export const Css = {
  /** Outermost main container of the chart */
  wrapper: 'gt-main-container',
  /** Prevents all user interactions (clicks, selections) */
  preventUserInteraction: 'gt-prevent-user-interactions',
  diagnostics: {
    /** Container for the diagnostic log modal (popup)*/
    container: 'gt-stats-log-container',
    /** List of error logs */
    errorList: 'gt-stats-error-list',
    /** Individual row in the log */
    errorListRow: 'gt-stats-row',
    // group: 'gt-stats-group', // TODO does not even exist
    /** Clickable link to open the corresponding note */
    openFileLink: 'gt-stats-open-file-link',
    logInfo: 'gt-log-info',
    logWarn: 'gt-log-warn',
    logError: 'gt-log-error',
    logFatal: 'gt-log-fatal',
  },
  toolbar: {
    /** Main container of the toolbar */
    container: 'gt-toolbar-container',
    /** Minimized state of the toolbar */
    minimized: 'gt-toolbar-minimized',
    /** Button group for logical grouping */
    buttonGroup: 'gt-toolbar-buttongroup', /* Reduces horizontal space between buttons */
    /** Individual toolbar button */
    button: 'gt-toolbar-button', /* Button and SVG sizes */
    /** Highlighted/warning toolbar button */
    buttonWarn: 'gt-toolbar-button-warn', /* Button and SVG sizes */
    /** Separator line between button groups */
    separator: 'gt-toolbar-separator', /* Separates button groups */
    /** Fold/unfold button in the minimized state */
    foldButton: 'gt-minimized-btn', // TODO rename
  },
  /** Label for form inputs */
  inputLabel: 'gt-input-label',
  /** Scrollable container for the actual chart */
  chartContainer: 'gt-chart-container',
  axis: {
    // /** Baseline of the calendar axis */
    // baseline: 'gt-axis-baseline', // TODO does not even exist
    /** Gridlines in the calendar grid */
    gridline: 'gt-axis-gridline',
    /** Label of the calendar axis */
    label: 'gt-axis-label',
    /** Badge/background for axis labels */
    labelBadge: 'gt-axis-label-badge',
    /** Text element of the axis */
    text: 'gt-axis-text',
    // /** Main tick of the scale */
    // tick: 'gt-axis-tick',
    /** Minor tick of the scale */
    tickMinor: 'gt-axis-tick-minor',
    /** SVG icon for moon phases */
    moonIcon: 'gt-moon-phase-icon',
    /** Illuminated part of the moon phase */
    moonFull: 'gt-moon-fill',
    /** Unlit part of the moon phase */
    moonUnlit: 'gt-moon-unlit',
    /** End-cap marker at start and end days */
    capMarker: 'gt-calendar-cap-marker', /* todo rename ? */
    /** Reign epoch title over the axis */
    calReignTitle: 'gt-calendar-reign-title',
  },
  item: {
    /** Base CSS class for all event SVG elements */
    item: 'gt-item',
    /** Standard timestamp shape without layout overhead */
    timestamp: 'gt-item timestamp',
    /** Box element for point events */
    box: 'gt-item timestamp box',
    /** Bar element for time spans */
    bar: 'gt-item timespan bar',
    /** Era element for large time periods */
    era: 'gt-item timespan era',
    /** Text for timestamp events */
    textTimestamp: 'gt-item text-timestamp',
    /** Text for bar events */
    textBar: 'gt-item text-bar',
    /** Text for era events */
    textEra: 'gt-item text-era',
    /** Visual vertical hover overlay */
    verticalOverlay: 'gt-item vertical-overlay',
    /** Container for icons inside events */
    iconContainer: 'gt-item icon-container',
  },
  itemLayer: {
    /** SVG layer for eras */
    era: 'gt-layers-eras',
    /** SVG layer for repeaters */
    repeater: 'gt-layers-repeaters',
  },
  group: {
    /** Text for group badges */
    text: 'gt-group-text',
    /** Pill badge for groups */
    badge: 'gt-group-badge',
    /** Background row (even) */
    rowEven: 'gt-group-row-even',
    /** Background row (odd) */
    rowOdd: 'gt-group-row-odd',
  },
  hover: {
    /** Highlight for the directly hovered event */
    highlightHoveredEvent: 'gt-item symbol-hover', /* Highlight on hovered event */
    /** Highlight for related/dependent events */
    highlightRelatedEvent: 'gt-item symbol-hover-related' /* Highlight on events related to hovered event */
  },
  tooltip: {
    /** Main container of the tooltip */
    tooltip: 'gt-tooltip',
    /** Title inside the tooltip */
    title: 'gt-tooltip-title',
    /** Data table inside the tooltip */
    table: 'gt-tooltip-table',
    /** Link to related note in the tooltip */
    link: 'gt-tooltip-link',
    /** Date details for repetitions */
    dateDetails: 'gt-tooltip-repeat-dates',
    /** Single row of a repetition */
    repeatRow: 'gt-repeat-row',
    /** Value inside the repetition row */
    suffixRow: 'gt-repeat-value',
    /** Connection line/arrow class */
    arrows: 'gt-dependency-arrow',
  },
  svg: {
    /** Main element of the SVG canvas */
    canvas: 'gt-svg-canvas',
  },
  /* obsidian native classes */
  theme: {
    /** Dark Obsidian theme */
    dark: 'theme-dark',
    /** Light Obsidian theme */
    light: 'theme-light',
  },
  /** Width for specific modals. Raises width to 90vw */
  modalWidth: 'gt-modal-width',
  /** Obsidian native classes */
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
