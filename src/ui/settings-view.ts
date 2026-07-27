import {App, ColorComponent, PluginSettingTab, Setting, TFolder} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {Css} from '../const/strings'
import {GroupOrCalendarSettings, isCalendarIdentifier} from "../const/types";

export class FantasyGanttSettingTab extends PluginSettingTab {

  constructor(app: App, public readonly plugin: FantasyGanttPlugin) {
    super(app, plugin)
  }

  // This is the old pre-1.13. version of settings
  display(): void {
    const {containerEl} = this
    containerEl.empty()

    /* Add event and calendar path source selection */
    containerEl.createEl('h2', {text: 'Event and calendar source path selection'})
    this.addDataSourceSettings(containerEl)

    containerEl.createEl('h2', {text: 'Default values'})
    this.addCalendarSelection(containerEl)
    this.addColorSelection(containerEl)

    containerEl.createEl('h3', {text: 'Calendar control'})
    containerEl.createEl('div', {
      text: 'Control which calendar types are visible on your timelines. If a calendar type is turned off here,' +
        ' items belonging to that calendar type will be hidden.',
      cls: Css.settings.itemDescription
    })


    void this.renderCalendarSettings(containerEl)
    // void this.renderGroupSettings(containerEl)

    // // 3. Calendar/Timestamp Type Colors Section
    // containerEl.createEl('h3', {text: 'Default Colors for Timestamp Types (Calendars)'})
    //
    // const typeContainer = containerEl.createDiv({cls: Css.settings.container})
    // this.renderMapSettings(typeContainer, this.plugin.settings.,
    //   'New type (e.g., mayan)', '#2e7d32', true
    // )

    // 4. Group Colors Section
    // containerEl.createEl('h3', {text: 'Default Colors for Groups'})
    //
    // const groupContainer = containerEl.createDiv({cls: Css.settings.container})
    // this.renderMapSettings(groupContainer, this.plugin.settings.groups,
    //   'New group (e.g., Quest)', '#ff8f00', false
    // )
  }

  private addColorSelection(containerEl: HTMLElement) {
    new Setting(containerEl).setName('Default fallback color')
    .setDesc('Used when no color is defined in the item front-matter, ' +
      'its group, or its calendar type.')
    .addColorPicker(color => color
    .setValue(this.plugin.settings.fallbackColor)
    .onChange(async (value) => {
      this.plugin.settings.fallbackColor = value
      await this.plugin.saveSettings()
    }))
  }

  private addCalendarSelection(containerEl: HTMLElement) {
    new Setting(containerEl).setName('Default calendar')
    .setDesc('The fallback value for gantt-type if it is not explicitly defined in a file.')
    .addText(text => text
    .setPlaceholder('gregorian')
    .setValue(this.plugin.settings.defaultCalendar)
    .onChange(async (value) => {
      const v = value.trim()
      this.plugin.settings.defaultCalendar = isCalendarIdentifier(v) ? v : 'gregorian'
      await this.plugin.saveSettings()
    }))
  }

  /**
   * Renders a list of checkbox toggles for each calendar type found in typeColors
   */
  private async renderCalendarSettings(containerEl: HTMLElement) {
    const mainCalendarContainer = containerEl.createDiv({cls: Css.settings.calendarControl})

    let calendars: Record<string, GroupOrCalendarSettings> = this.plugin.settings.calendars
    const defaultType = this.plugin.settings.defaultCalendar

    const definedTypes = Object.keys(calendars)

    if (!definedTypes.includes(defaultType)) {
      definedTypes.push(defaultType)
      calendars[defaultType] = {"visible": true, "color": "#7f2f70", "priority": 0}
    }

    const prios: { minPrio: number, maxPrio: number } = await this.fixPrioritiesIfNecessary(calendars)

    const sortedCalendarList: [string, GroupOrCalendarSettings][] = Object.entries(calendars)
    .sort(([, a], [, b]) => (a.priority ?? Infinity) - (b.priority ?? Infinity));

    for (const [id, calendar] of sortedCalendarList) {

      calendar.visible ??= false

      let clrPicker: ColorComponent
      const currPrio: number = calendar.priority!
      const isDefaultCalendar: boolean = id === this.plugin.settings.defaultCalendar
      const isHighestPrio = currPrio <= prios.minPrio
      const isLowestPrio =
        currPrio >= prios.maxPrio

      new Setting(mainCalendarContainer).setName(`Calendar "${id}"`)
      .setDesc('Change visibility, color and order or appearance')
      .addButton(btn => btn.setIcon(calendar.visible ? 'eye' : 'eye-off')
        .setTooltip('Click to toggle visibility', {delay: -1})
        .onClick(async () => {
          calendar.visible = !calendar.visible
          void btn.setIcon(calendar.visible ? 'eye' : 'eye-off')
          await this.plugin.saveSettings()
        })
      )

      .addColorPicker(cc => clrPicker = cc
        .setValue(calendar.color ?? this.plugin.settings.fallbackColor)
        .onChange(async (value) => {
          calendar.color = value
          await this.plugin.saveSettings()
        })
      )

      .addButton(btn => btn.setIcon('rotate-ccw').setTooltip('Reset color', {delay: -1})
        .onClick(async () => {
          calendar.color = undefined
          clrPicker.setValue(this.plugin.settings.fallbackColor)
          await this.plugin.saveSettings()
        })
      )

      ////////

      .addButton(btn => btn.setIcon('chevron-down')
        .setTooltip(isLowestPrio ? 'Can not lower further' : 'Lower priority by 1', {delay: -1})
        .setDisabled(isLowestPrio)
        .onClick(async () => {

          const calendarSettings = Object.values(calendars).filter(x => x.priority === currPrio + 1);

          if (calendarSettings?.length === 1) {
            const temp = currPrio
            calendar.priority = calendarSettings[0]!.priority
            calendarSettings[0]!.priority = temp
          }

          await this.plugin.saveSettings()
          mainCalendarContainer.empty()
          await this.renderCalendarSettings(containerEl)
        })
      )

      .addButton(btn => btn.setIcon('chevron-up')
        .setTooltip(isHighestPrio ? 'Can not raise further' : 'Raise priority by 1', {delay: -1})
        .setDisabled(isHighestPrio)
        .onClick(async () => {

          const calendarSettings = Object.values(calendars).filter(x => x.priority === currPrio - 1);

          if (calendarSettings?.length === 1) {
            const temp = currPrio
            calendar.priority = calendarSettings[0]!.priority
            calendarSettings[0]!.priority = temp
          }

          await this.plugin.saveSettings()
          mainCalendarContainer.empty()
          await this.renderCalendarSettings(containerEl)
        })
      )

      ////////

      .addButton(btn => btn.setIcon('trash-2').setWarning()
        .setTooltip(isDefaultCalendar ? 'Can not delete default calendar' : 'Delete', {delay: -1})
        .setDisabled(isDefaultCalendar)
        .onClick(async () => {
          delete this.plugin.settings.calendars[id]

          await this.plugin.saveSettings()
          mainCalendarContainer.empty()
          await this.renderCalendarSettings(containerEl)
        })
      )

    } // end of calendar loop

    let calendarName = ''

    new Setting(mainCalendarContainer).setName('Add calendar')
    .setDesc('Default color will be assigned.')
    .addText(text => text
      .setPlaceholder('New name')
      .onChange(val => calendarName = val.trim())
    )
    .addExtraButton(eb => eb.setIcon('save')
      .onClick(async () => {
          if (calendarName && !calendars[calendarName]) {
            calendars[calendarName] = {
              visible: true,
              color: this.plugin.settings.fallbackColor,
              priority: prios.maxPrio + 1
            }

            await this.plugin.saveSettings()
            mainCalendarContainer.empty()
            await this.renderCalendarSettings(containerEl)
          }
        }
      )
    )


  }


  private addDataSourceSettings(containerEl: HTMLElement) {
    const folders: Record<string, string> = this.getAllPaths()
    this.addEventPathSelection(containerEl, folders)
    this.addCalendarPathSelection(containerEl, folders)
  }

  private getAllPaths() {
    const folders = this.plugin.app.vault.getAllLoadedFiles()
    .filter(file => file instanceof TFolder)
    .map(file => file.path)

    folders.sort((a, b) => a.localeCompare(b, undefined,
      {numeric: true, sensitivity: 'base'}));

    // Modern syntax mapping
    return {
      '/': '[root]',
      ...Object.fromEntries(folders.filter(f => f !== '/').map(f => [f, f]))
    }
  }

  private addEventPathSelection(containerEl: HTMLElement, folders: Record<string, string>) {

    new Setting(containerEl)
    .setName('Folder to search for timeline events.')
    .setDesc('Folder can be searched recursively.')
    .addDropdown(dd => dd
      .addOptions(folders)
      .setValue(this.plugin.settings.eventPath || '/')
      .onChange(async (value) => {
        this.plugin.settings.eventPath = value
        await this.plugin.saveSettings()
      })
    )
    .addToggle(tt => tt
      .setValue(this.plugin.settings.eventPathSearchRecursive)
      .setTooltip('Search recursively?', {delay: -1})
      .onChange(async (value) => {
        this.plugin.settings.eventPathSearchRecursive = value
        await this.plugin.saveSettings()
      })
    )
  }

  private addCalendarPathSelection(containerEl: HTMLElement, folders: Record<string, string>) {

    new Setting(containerEl)
    .setName('Folder to search for calendar definitions.')
    .setDesc('Folder can be searched recursively.')
    .addDropdown(dd => dd
      .addOptions(folders)
      .setValue(this.plugin.settings.calendarPath || '/')
      .onChange(async (value) => {
        this.plugin.settings.calendarPath = value
        await this.plugin.saveSettings()
      })
    )
    .addToggle(tt => tt
      .setValue(this.plugin.settings.calendarPathSearchRecursive)
      .setTooltip('Search recursively?', {delay: -1})
      .onChange(async (value) => {
        this.plugin.settings.calendarPathSearchRecursive = value
        await this.plugin.saveSettings()
      })
    )
  }

  private async fixPrioritiesIfNecessary(calendars: Record<string, GroupOrCalendarSettings>):
    Promise<{ minPrio: number, maxPrio: number }> {

    let min: number | undefined = undefined
    let max: number | undefined = undefined
    const priorities: number[] = []
    let valid = true


    Object.values(calendars).forEach(cal => {
      if (cal.priority === undefined || cal.priority === null || priorities.contains(cal.priority)) {
        valid = false
      } else {
        priorities.push(cal.priority)
        if (min === undefined || cal.priority < min) min = cal.priority
        if (max === undefined || cal.priority > max) max = cal.priority
      }
    })

    if (!valid) {
      let i = 0
      min = i
      max = i

      /* Just overwrite values now */
      Object.values(calendars).forEach(cal => {
        cal.priority = i
        max = i++
      })

      await this.plugin.saveSettings()
    }

    return {minPrio: min ?? 0, maxPrio: max ?? 0}
  }

}
