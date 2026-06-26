import {App, PluginSettingTab, Setting} from 'obsidian'
import FantasyGanttPlugin from './main'


export class FantasyGanttSettingTab extends PluginSettingTab {
  constructor(app: App, public readonly plugin: FantasyGanttPlugin) {
    super(app, plugin)
  }

  // This is the old pre-1.13. version of settings
  display(): void {
    const {containerEl} = this
    containerEl.empty()
    containerEl.createEl('h2', {text: 'Fantasy Gantt Plugin Settings'})

    this.addCalendarSelection(containerEl)
    this.addColorSelection(containerEl)

    containerEl.createEl('h3', {text: 'Calendar Visibility Filter'})
    containerEl.createEl('p', {
      text: 'Control which calendar types are visible on your timelines. If a calendar type is turned off here,' +
        ' items belonging to that calendar type will be hidden.',
      cls: 'gt-setting-item-description'
    })

    const visibilityContainer = containerEl.createDiv({cls: 'gantt-settings-visibility-list'})
    this.renderVisibilitySettings(visibilityContainer)

    // 3. Calendar/Timestamp Type Colors Section
    containerEl.createEl('h3', {text: 'Default Colors for Timestamp Types (Calendars)'})

    const typeContainer = containerEl.createDiv({cls: 'gantt-settings-container'})
    this.renderMapSettings(typeContainer, this.plugin.settings.typeColors,
      'New type (e.g., mayan)', '#2e7d32', true
    )

    // 4. Group Colors Section
    containerEl.createEl('h3', {text: 'Default Colors for Groups'})

    const groupContainer = containerEl.createDiv({cls: 'gantt-settings-container'})
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
      if (this.plugin.settings.visibleCalendars[typeKey] === undefined) {
        this.plugin.settings.visibleCalendars[typeKey] = true
      }

      new Setting(container)
      .setName(`Show "${typeKey}" Calendar`)
      .setDesc(`Toggle visibility for files using gantt-type: "${typeKey}"`)
      .addToggle(toggle => toggle
      .setValue(this.plugin.settings.visibleCalendars[typeKey])
      .onChange(async (value) => {
        this.plugin.settings.visibleCalendars[typeKey] = value
        await this.plugin.saveSettings()
      }))
    })
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
    const listEl = container.createDiv({cls: 'gantt-settings-list'})

    // Render existing records
    Object.entries(record).forEach(([key, colorValue]) => {
      const row = listEl.createDiv({
        cls: 'gantt-settings-row',
        attr: {style: 'display: flex; gap: 10px; margin-bottom: 5px; align-items: center;'}
      })

      row.createEl('span', {text: key, attr: {style: 'flex-grow: 1; font-weight: bold;'}})

      const picker = row.createEl('input', {attr: {type: 'color', value: colorValue}})
      picker.addEventListener('change', async (e) => {
        record[key] = (e.target as HTMLInputElement).value
        await this.plugin.saveSettings()
      })

      const deleteBtn = row.createEl('button', {text: 'Delete', cls: 'mod-warning'})
      deleteBtn.addEventListener('click', async () => {
        delete record[key]
        if (syncToVisibility && this.plugin.settings.visibleCalendars[key] !== undefined) {
          delete this.plugin.settings.visibleCalendars[key]
        }
        await this.plugin.saveSettings()
        this.display() // Refresh gui
      })
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
