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
    text: 'gt-axis-text',
    tick: 'gt-axis-tick',
    tickMinor: 'gt-axis-tick-minor',
  },
  item: {
    item: 'gt-item',
    bar: 'gt-item bar-rect',
    point: 'gt-item point-circle',
  },
  group: {
    badge: 'gt-group-badge',
    rowEven: 'gt-group-row-even',
    rowOdd: 'gt-group-row-odd',
    text: 'gt-group-text',
    shadow: 'gt-group-shadow',
  },
  tooltip: {
    tooltip: 'gt-tooltip',
    dates: 'gt-tooltip-dates',
    isActive:'is-active',
    link: 'gt-tooltip-link',
    title: 'gt-tooltip-title',
  },
  settings: {
    container: 'gt-settings-container',
    row: 'gt-settings-row',
    list: 'gt-settings-list',
    itemDescription: 'gt-settings-item-description',
    visibilityList: 'gt-settings-visibility-list',
    emptyNotice:'gt-settings-empty-notice'
  },
  svg: {
    canvas: 'gt-svg-canvas',
  },


  // obsidian native classes
  theme: {
    dark: 'theme-dark',
    light: 'theme-light',
  },

  // obsidian native classes
  modWarning: 'is-destructive',

} as const

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
  splitOnce : (splitMe:string, separator:string): {left:string, right:string}=> {
    const index = splitMe.indexOf(separator)
    if (index === -1) {
      return { left: splitMe.trim(), right: '' }
    }
    const left = splitMe.slice(0, index).trim()
    const right = splitMe.slice(index + 1).trim()
    return {left, right}
  }
}
