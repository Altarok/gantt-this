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
    bar: 'gt-item bar-rect',
    barText: 'gt-item bar-text',
    circle: 'gt-item point-circle',
    diamond: 'gt-item point-diamond',
    icon: 'gt-item point-icon',
    iconExternal: 'gt-item point-icon-external',
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
    link: 'gt-tooltip-link',
    title: 'gt-tooltip-title',
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

export const Colors : Record<string,string> = {
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

export const EventIDs = {
  tooltip: 'gantt-tooltip-element'
} as const

export const svgUrl = 'http://www.w3.org/2000/svg'

export const CodeBlock = {
  id: 'gantt-this',
  eventPath: 'eventPath',
  calendarPath: 'calendarPath',
}

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
