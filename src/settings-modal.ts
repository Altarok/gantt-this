import {App, PluginSettingTab, Setting, TFolder} from 'obsidian'
import FantasyGanttPlugin from './main'
import {Css} from './const/strings'


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

    addDataSourceSettings(containerEl, this.plugin)


    containerEl.createEl('h2', {text: 'Fantasy Gantt Plugin Settings'})

    this.addCalendarSelection(containerEl)
    this.addColorSelection(containerEl)

    containerEl.createEl('h3', {text: 'Calendar Visibility Filter'})
    containerEl.createEl('p', {
      text: 'Control which calendar types are visible on your timelines. If a calendar type is turned off here,' +
        ' items belonging to that calendar type will be hidden.',
      cls: Css.settings.itemDescription
    })

    const visibilityContainer = containerEl.createDiv({cls: Css.settings.visibilityList})
    this.renderVisibilitySettings(visibilityContainer)

    // 3. Calendar/Timestamp Type Colors Section
    containerEl.createEl('h3', {text: 'Default Colors for Timestamp Types (Calendars)'})

    const typeContainer = containerEl.createDiv({cls: Css.settings.container})
    this.renderMapSettings(typeContainer, this.plugin.settings.typeColors,
      'New type (e.g., mayan)', '#2e7d32', true
    )

    // 4. Group Colors Section
    containerEl.createEl('h3', {text: 'Default Colors for Groups'})

    const groupContainer = containerEl.createDiv({cls: Css.settings.container})
    this.renderMapSettings(groupContainer, this.plugin.settings.groupColors,
      'New group (e.g., Quest)', '#ff8f00', false
    )
  }

  private addColorSelection(containerEl: HTMLElement) {
    new Setting(containerEl).setName('Global Fallback Color')
      .setDesc('Used when no color is defined in the item front-matter, its group, or its calendar type.')
      .addColorPicker(color => color
        .setValue(this.plugin.settings.fallbackColor)
        .onChange(async (value) => {
          this.plugin.settings.fallbackColor = value
          await this.plugin.saveSettings()
        }))
  }

  private addCalendarSelection(containerEl: HTMLElement) {
    new Setting(containerEl).setName('Default Timestamp Type')
      .setDesc('The fallback value for gantt-type if it is not explicitly defined in a file.')
      .addText(text => text
        .setPlaceholder('iso-8601')
        .setValue(this.plugin.settings.defaultType)
        .onChange(async (value) => {
          this.plugin.settings.defaultType = value.trim() || 'iso-8601'
          await this.plugin.saveSettings()
        }))
  }

  /**
   * Renders a list of checkbox toggles for each calendar type found in typeColors
   */
  private renderVisibilitySettings(container: HTMLElement) {
    const definedTypes = Object.keys(this.plugin.settings.typeColors)

    if (!definedTypes.includes(this.plugin.settings.defaultType)) {
      definedTypes.push(this.plugin.settings.defaultType)
    }

    if (definedTypes.length === 0) {
      container.createEl('span', {
        text: 'No custom calendar types added yet. Add an assignment below to filter visibility.',
        attr: {style: 'font-style: italic; color: var(--text-muted);'}
      })
      return
    }

    definedTypes.forEach(typeKey => {
      // Ensure state is initialized in the record

      const {visibleCalendars} = this.plugin.settings

      /*
      * TODO debugger: what does ??= do
       */
      // debugger

      visibleCalendars[typeKey] ??= true

      new Setting(container)
        .setName(`Show "${typeKey}" Calendar`)
        .setDesc(`Toggle visibility for files using gantt-type: "${typeKey}"`)
        .addToggle(toggle => toggle
          .setValue(visibleCalendars[typeKey]!)
          .onChange(async (value) => {
            visibleCalendars[typeKey] = value
            await this.plugin.saveSettings()
          }))
    })
  }

  private saveSettings() {
    void this.plugin.saveSettings() // TODO await this
  }

  /**
   * Helper function to dynamically render key-value dynamic color records with an add/delete flow
   */
  private renderMapSettings(
    container: HTMLElement,
    record: Record<string, string>,
    placeholderText: string,
    defaultColor: string,
    syncToVisibility: boolean
  ) {
    const listEl = container.createDiv({cls: Css.settings.list})

    // Render existing records
    Object.entries(record).forEach(([key, colorValue]) => {
      const row = listEl.createDiv({
        cls: Css.settings.row,
        attr: {style: 'display: flex; gap: 10px; margin-bottom: 5px; align-items: center;'}
      })

      row.createEl('span', {text: key, attr: {style: 'flex-grow: 1; font-weight: bold;'}})

      const picker = row.createEl('input', {attr: {type: 'color', value: colorValue}})
      picker.addEventListener('change',
        (e) => {
          record[key] = (e.target as HTMLInputElement).value
          this.saveSettings() // TODO await this
        }
      )

      const deleteBtn = row.createEl('button', {text: 'Delete', cls: Css.modWarning})
      deleteBtn.addEventListener('click',
        () => {
          delete record[key]
          if (syncToVisibility && this.plugin.settings.visibleCalendars[key] !== undefined) {
            delete this.plugin.settings.visibleCalendars[key]
          }
          this.saveSettings() // TODO await this
          this.display() // Refresh gui
        }
      )
    })

    // Add new row UI block

    let calendarName = ''
    let calendarColor = defaultColor

    new Setting(container)
      .setName('Add Assignment')
      .setDesc('Add a new key and assign its default color.')
      .addText(text =>
        text.setPlaceholder(placeholderText)
          .onChange(val => calendarName = val.trim())
      )
      .addColorPicker(cp =>
        cp.setValue(defaultColor)
          .onChange(val => calendarColor = val)
      )
      .addExtraButton(eb => eb.setIcon('save')
        .onClick(async () => {
            if (calendarName && !record[calendarName]) {
              record[calendarName] = calendarColor

              if (syncToVisibility) this.plugin.settings.visibleCalendars[calendarName] = true

              await this.plugin.saveSettings()
              this.display()
            }
          }
        )
      )
  }
}

function addDataSourceSettings(containerEl: HTMLElement, plugin: FantasyGanttPlugin) {
  containerEl.createEl('h2', {text: 'Event source'})

  const folders:  Record<string, string> = getAllPaths(plugin)

  addEventPathSelection(containerEl, plugin, folders)
  addCalendarPathSelection(containerEl, plugin, folders)
}

function getAllPaths( plugin: FantasyGanttPlugin) {
  const folders = plugin.app.vault.getAllLoadedFiles()
    .filter(file => file instanceof TFolder)
    .map(file => file.path)

  folders.sort((a, b) => a.localeCompare(b, undefined,
    {numeric: true, sensitivity: 'base'}));

  const options: Record<string, string> = {}
  options['/'] = '[root]'
  folders.filter(f => f !== '/').forEach(f => options[f] = f === '/' ? '[root]' : f)

  return options
}

function addEventPathSelection(containerEl: HTMLElement, plugin: FantasyGanttPlugin, folders:  Record<string, string>) {

  new Setting(containerEl)
    .setName('Folder to search for timeline events.')
    .setDesc('Folder can be searched recursively.')
    .addDropdown(dd => dd
      .addOptions(folders)
      .setValue(plugin.settings.eventPath || '/')
      .onChange(async (value) => {
        plugin.settings.eventPath = value
        await plugin.saveSettings()
      })
    )
    .addToggle(tt => tt
      .setValue( plugin.settings.eventPathSearchRecursive)
      .setTooltip('Search recursively?', {delay: -1})
      .onChange(async (value) => {
        plugin.settings.eventPathSearchRecursive = value
        await plugin.saveSettings()
      })
    )
}

function addCalendarPathSelection(containerEl: HTMLElement, plugin: FantasyGanttPlugin, folders:  Record<string, string>) {

  new Setting(containerEl)
    .setName('Folder to search for calendar definitions.')
    .setDesc('Folder can be searched recursively.')
    .addDropdown(dd => dd
      .addOptions(folders)
      .setValue(plugin.settings.calendarPath || '/')
      .onChange(async (value) => {
        plugin.settings.calendarPath = value
        await plugin.saveSettings()
      })
    )
    .addToggle(tt => tt
      .setValue( plugin.settings.calendarPathSearchRecursive)
      .setTooltip('Search recursively?', {delay: -1})
      .onChange(async (value) => {
        plugin.settings.calendarPathSearchRecursive = value
        await plugin.saveSettings()
      })
    )
}


