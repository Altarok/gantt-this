export const Css = {
  wrapper: 'fantasy-gantt-wrapper',


  toolbar: 'gantt-toolbar',
  inputLabel: 'gantt-input-label',
  btn: 'gantt-btn',
  btnHover: 'ganttBtnHover',

  chartContainer: 'gantt-chart-container',


  axis: {
    baseline: 'gantt-axis-baseline',
    gridline: 'gantt-axis-gridline',
    label: 'gantt-axis-label',
    text: 'gantt-axis-text',
    tick: 'gantt-axis-tick',
    tickMinor: 'gantt-axis-tick-minor',
  },
  item: {
    item: 'gantt-item',
    bar: 'gantt-item bar-rect',
    point: 'gantt-item point-circle',
  },
  group: {
    badge: 'gantt-group-badge',
    rowEven: 'gantt-group-row-even',
    rowOdd: 'gantt-group-row-odd',
    text: 'gantt-group-text',
    shadow: 'gantt-group-shadow',
  },

  tooltip: {
    tooltip: 'gantt-tooltip',
    dates: 'tooltip-dates',
    isActive:'is-active',
    link: 'tooltip-link',
    title: 'tooltip-title',
  },

  settings: {
    row: 'gantt-settings-row', // todo missing
    list: 'gantt-settings-list',  // todo missing
    container: 'gantt-settings-container',  // todo missing
    itemDescription: 'gt-settings-item-description',
    visibilityList: 'gantt-settings-visibility-list',  // todo missing
  },
  svg: {
    canvas: 'gantt-svg-canvas',
  },

  theme: {
    dark: 'theme-dark',
    light: 'theme-light',
  },

  modWarning: 'mod-warning',

} as const

export const CodeBlock = {
  eventPath: 'eventPath',
  calendarPath: 'calendarPath',
}
