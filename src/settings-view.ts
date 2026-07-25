import {App, ColorComponent, PluginSettingTab, Setting, TFolder} from 'obsidian'
import FantasyGanttPlugin from './main'
import {Css} from './const/strings'
import {CalendarSettings, isCalendarIdentifier} from "./const/types";


/*
 * TODO needs complete rework, use expandable
 */
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


    this.renderVisibilitySettings(containerEl)

    // // 3. Calendar/Timestamp Type Colors Section
    // containerEl.createEl('h3', {text: 'Default Colors for Timestamp Types (Calendars)'})
    //
    // const typeContainer = containerEl.createDiv({cls: Css.settings.container})
    // this.renderMapSettings(typeContainer, this.plugin.settings.typeColors,
    //   'New type (e.g., mayan)', '#2e7d32', true
    // )

    // 4. Group Colors Section
    // containerEl.createEl('h3', {text: 'Default Colors for Groups'})
    //
    // const groupContainer = containerEl.createDiv({cls: Css.settings.container})
    // this.renderMapSettings(groupContainer, this.plugin.settings.groupColors,
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
        .setValue(this.plugin.settings.defaultType)
        .onChange(async (value) => {
          const v = value.trim()
          this.plugin.settings.defaultType = isCalendarIdentifier(v) ? v : 'gregorian'
          await this.plugin.saveSettings()
        }))
  }

  /**
   * Renders a list of checkbox toggles for each calendar type found in typeColors
   */
  private async renderVisibilitySettings(containerEl: HTMLElement) {
    const container = containerEl.createDiv({cls: Css.settings.calendarControl})

    let calendars: Record<string, CalendarSettings> = this.plugin.settings.calendars!
    const defaultType = this.plugin.settings.defaultType!

    const definedTypes = Object.keys(calendars)

    if (!definedTypes.includes(defaultType)) {
      definedTypes.push(defaultType)
      calendars[defaultType] = {"visible": true, "color": "#7f2f70", "priority": 0}
    }

    const prios: { minPrio: number, maxPrio: number } = await this.fixPrioritiesIfNecessary(calendars)

    // if (definedTypes.length === 0) {
    //   container.createEl('span', {
    //     text: 'No custom calendar types added yet. Add an assignment below to filter visibility.',
    //     cls: Css.settings.emptyNotice
    //   })
    //   return
    // }

    definedTypes.forEach((typeKey, value) => {

      const calendar: CalendarSettings = calendars[typeKey]!
      if (undefined === calendar.visible) calendar.visible = false

      let clrPicker: ColorComponent
      const currPrio: number = calendar.priority!

      new Setting(container)
        .setName(`Calendar "${typeKey}"`)
        .setDesc('Change visibility, color and priority')

        .addButton(btn => btn
          .setIcon(calendar.visible ? 'eye' : 'eye-off')
          .setTooltip('Click to toggle visibility', {delay: -1})
          .onClick(async () => {
            calendar.visible = !calendar.visible
            void btn.setIcon(calendar.visible ? 'eye' : 'eye-off')
            await this.plugin.saveSettings()
          }))

        .addColorPicker(cc => clrPicker = cc
          .setValue(calendar.color ?? this.plugin.settings.fallbackColor)
          .onChange(async (value) => {
            calendar.color = value
            await this.plugin.saveSettings()
          }))

        .addButton(btn => btn
          .setIcon('rotate-ccw')
          .setTooltip('Reset color', {delay: -1})
          .onClick(async () => {
            calendar.color = undefined
            clrPicker.setValue(this.plugin.settings.fallbackColor)
            await this.plugin.saveSettings()
          }))

        ////////

        .addButton(btn => btn
          .setIcon('chevron-down')
          .setTooltip('Lower priority by 1', {delay: -1})
          .setDisabled(currPrio >= prios.maxPrio)
          .onClick(async () => {

            const calendarSettings = Object.values(calendars).filter(x => x.priority = currPrio + 1);

            debugger

            if (calendarSettings?.length === 1) {
              const temp = currPrio
              calendar.priority = calendarSettings[0]!.priority
              calendarSettings[0]!.priority = temp
            }

            await this.plugin.saveSettings()
            this.display()
          }))

        .addButton(btn => btn
          .setIcon('chevron-up')
          .setTooltip('Raise priority by 1', {delay: -1})
          .setDisabled(currPrio <= prios.minPrio)
          .onClick(async () => {

            const calendarSettings = Object.values(calendars).filter(x => x.priority = currPrio - 1);

            debugger

            if (calendarSettings?.length === 1) {
              const temp = currPrio
              calendar.priority = calendarSettings[0]!.priority
              calendarSettings[0]!.priority = temp
            }

            await this.plugin.saveSettings()
            this.display()
          }))
    })
  }

  // /**
  //  * Helper function to dynamically render key-value dynamic color records with an add/delete flow
  //  */
  // private renderMapSettings(
  //   container: HTMLElement,
  //   record: Record<string, string>,
  //   placeholderText: string,
  //   defaultColor: string,
  //   syncToVisibility: boolean
  // ) {
  //   const listEl = container.createDiv({cls: Css.settings.list})
  //
  //   // Render existing records
  //   Object.entries(record).forEach(([key, colorValue]) => {
  //     const row = listEl.createDiv({cls: Css.settings.row})
  //
  //     row.createEl('span', {text: key})
  //
  //     const picker = row.createEl('input', {attr: {type: 'color', value: colorValue}})
  //     picker.addEventListener('change', (e) => {
  //       record[key] = (e.target as HTMLInputElement).value
  //       this.plugin.saveSettings().catch(err => new Notice('Failed to save color' + err))
  //     })
  //
  //     const deleteBtn = row.createEl('button', {cls: Css.modWarning})
  //     setIcon(deleteBtn, 'trash-2')
  //     deleteBtn.addEventListener('click', () => {
  //       delete record[key]
  //       if (syncToVisibility && this.plugin.settings.visibleCalendars[key] !== undefined) {
  //         delete this.plugin.settings.visibleCalendars[key]
  //       }
  //       this.plugin.saveSettings().then(() => this.display()).catch(err => new Notice('Failed to save color' + err))
  //     })
  //   })
  //
  //   // Add new row UI block
  //
  //   let calendarName = ''
  //   let calendarColor = defaultColor
  //
  //   new Setting(container)
  //     .setName('Add Assignment')
  //     .setDesc('Add a new key and assign its default color.')
  //     .addText(text =>
  //       text.setPlaceholder(placeholderText)
  //         .onChange(val => calendarName = val.trim())
  //     )
  //     .addColorPicker(cp =>
  //       cp.setValue(defaultColor)
  //         .onChange(val => calendarColor = val)
  //     )
  //     .addExtraButton(eb => eb.setIcon('save')
  //       .onClick(async () => {
  //           if (calendarName && !record[calendarName]) {
  //             record[calendarName] = calendarColor
  //
  //             if (syncToVisibility) this.plugin.settings.visibleCalendars[calendarName] = true
  //
  //             await this.plugin.saveSettings()
  //             this.display()
  //           }
  //         }
  //       )
  //     )
  // }

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

  private async fixPrioritiesIfNecessary(calendars: Record<string, CalendarSettings>): Promise<{ minPrio: number, maxPrio: number }> {


    debugger

    let min: number | undefined = undefined
    let max: number | undefined = undefined
    const priorities: number[] = []
    let valid: boolean = true


    Object.values(calendars).forEach(cal => {
      if (!cal.priority || priorities.contains(cal.priority)) {
        valid = false
      } else {
        priorities.push(cal.priority)
        if (!min || cal.priority < min) min = cal.priority
        if (!max || cal.priority > max) max = cal.priority
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

    debugger

    return {minPrio: min ?? 0, maxPrio: max ?? 0}
  }

}
