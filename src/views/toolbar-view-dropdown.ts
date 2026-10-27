import {Menu} from 'obsidian'
import {RedrawOption} from '../model/redraw-options'
import {debug} from '../util/debug'

export class ChartDropdownMenu extends Menu {
  /**
   * @param refreshChartCallback see gantt-chart-manager
   * @param drawContent
   */
  constructor(private readonly refreshChartCallback: (r: RedrawOption) => Promise<void>,
              private readonly drawContent: (menu: ChartDropdownMenu) => void) {
    super()
    this.drawContent(this)
    debug.log('Open dropdown')
  }

  addSettingRow(title: string, getValue: () => boolean, onChange: (b: boolean) => void, fullRedraw = false): this {
    debug.log(`Add dropdown option: ${title} = ${getValue()}`)
    this.addItem((item) => {
      item.setTitle(title)
      .setChecked(getValue())
      .onClick((_e) => {
        const next = !getValue()
        debug.log(`Set dropdown option: ${title} -> ${next}`)
        onChange(next)
        if (fullRedraw) void this.refreshChartCallback(RedrawOption.ManualReload)
        else void this.refreshChartCallback(RedrawOption.None)
      })
    })
    return this
  }

}
