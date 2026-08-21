export const Css = {
  wrapper: 'gt-wrapper',
  toolbar: 'gt-toolbar',
  inputLabel: 'gt-input-label',
  btn: 'gt-btn',
  chartContainer: 'gt-chart-container',
  axis: {
    baseline: 'gt-axis-baseline',
    gridline: 'gt-axis-gridline',
    label: 'gt-axis-label',
    labelBadge: 'gt-axis-label-badge',
    text: 'gt-axis-text',
    tick: 'gt-axis-tick',
    tickMinor: 'gt-axis-tick-minor',
  },
  button: {
    icon: 'gt-btn-icon',
  },
  item: {
    item: 'gt-item',

    circle: 'gt-item timestamp circle',
    diamond: 'gt-item timestamp diamond',
    triangle: 'gt-item timestamp triangle',
    hexagon: 'gt-item timestamp hexagon',
    pentagram: 'gt-item timestamp pentagon',
    line: 'gt-item timestamp vertical-line',

    bar: 'gt-item timespan bar',
    era: 'gt-item timespan era',

    textTimespan: 'gt-item text-timespan',
    textTimestamp: 'gt-item text-timestamp',

    // icon: 'gt-item point-icon-container',
    // iconExternal: 'gt-item point-icon-external',
  },
  group: {
    text: 'gt-group-text',
    badge: 'gt-group-badge',
    rowEven: 'gt-group-row-even',
    rowOdd: 'gt-group-row-odd',
  },
  tooltip: {
    tooltip: 'gt-tooltip',
    dates: 'gt-tooltip-dates',
    isActive: 'is-active',
    title: 'gt-tooltip-title',
    link: 'gt-tooltip-link',
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

export const Colors: Record<string, string> = {
  red: '#ff0000',
  white: '#ffffff',
  blue: '#002fff',
  green: '#3cb371',
  yellow: '#ffff00',
  gold: '#ffd700',
  black: '#000000',
  orange: '#ff8c00',
  pink: '#ff1493',
  purple: '#9400d3',
} as const

// export const EventIDs = {
//   tooltip: 'gantt-tooltip-element'
// } as const

export const svgUrl = 'http://www.w3.org/2000/svg'

export const StringUtils = {
  /**
   * Splits given string, but only at first appearance of the separator.<br>
   * Call like this:
   * <code>const {left: key, right: value} = StringUtils.splitOnce(line, ':')</code><br>
   * If the separator isn't found, returns the whole string as 'left' and an empty 'right'
   * @param splitMe string to be split
   * @param separator
   * @return <code>{left:string, right:string}</code>. Every returned value is trimmed.
   */
  splitOnce: (splitMe: string, separator: string): { left: string, right: string } => {
    const index = splitMe.indexOf(separator)
    if (index === -1) {
      return {left: splitMe.trim(), right: ''}
    }
    const left = splitMe.slice(0, index).trim()
    const right = splitMe.slice(index + 1).trim()
    return {left, right}
  }
}

export const Consts = {
  // DAYS_FROM_1_1_1_TO_1_1_1970: 719162, //  = days between 1-1-1 (day 1) and 1970-1-1
  CODEBLOCK_ID: 'gantt-this',
  DAYS_FROM_0_12_31_TO_1_1_1970: 719163, //  = days between 0-12-31 (day 0) and 1970-1-1
  MILLIS_IN_1_DAY: 86_400_000, // = 24 * 60 * 60 * 1000
  ROOT_PATH: '/',
  ROOT_PATH_NORMALIZED: '',
  DIR_SEPARATOR: '/'
} as const
