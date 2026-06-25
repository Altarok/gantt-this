import { App, PluginSettingTab, Setting } from 'obsidian'
import FantasyGanttPlugin from './main'

export interface FantasyGanttSettings {
  defaultType: string
  fallbackColor: string
  typeColors: Record<string, string>        // Map for calendar type colors (e.g., "iso-8601": "#2e7d32")
  groupColors: Record<string, string>       // Map for group colors (e.g., "Quest": "#ff8f00")
  visibleCalendars: Record<string, boolean> // Map for tracking calendar visibility toggles
}

export const DEFAULT_SETTINGS: FantasyGanttSettings = {
  defaultType: 'iso-8601',
  fallbackColor: '#1565c0',
  typeColors: {},
  groupColors: {},
  visibleCalendars: {}
}

export class FantasyGanttSettingTab extends PluginSettingTab {
  plugin: FantasyGanttPlugin

  constructor(app: App, plugin: FantasyGanttPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()

    containerEl.createEl('h2', { text: 'Fantasy Gantt Plugin Settings' })

    // 1. General Settings Section
    new Setting(containerEl)
      .setName('Default Timestamp Type')
      .setDesc('The fallback value for gantt-type if it is not explicitly defined in a file.')
      .addText(text => text
        .setPlaceholder('iso-8601')
        .setValue(this.plugin.settings.defaultType)
        .onChange(async (value) => {
          this.plugin.settings.defaultType = value.trim() || 'iso-8601'
          await this.plugin.saveSettings()
        }))

    new Setting(containerEl)
      .setName('Global Fallback Color')
      .setDesc('Used when no color is defined in the item frontmatter, its group, or its calendar type.')
      .addColorPicker(color => color
        .setValue(this.plugin.settings.fallbackColor)
        .onChange(async (value) => {
          this.plugin.settings.fallbackColor = value
          await this.plugin.saveSettings()
        }))

    // 2. Calendar Visibility Section
    containerEl.createEl('h3', { text: 'Calendar Visibility Filter' })
    containerEl.createEl('p', {
      text: 'Control which calendar types are visible on your timelines. If a calendar type is turned off here, items belonging to that calendar type will be hidden.',
      attr: { style: 'font-size: 0.9em; color: var(--text-muted); margin-bottom: 10px;' }
    })

    const visibilityContainer = containerEl.createDiv({ cls: 'gantt-settings-visibility-list' })
    this.renderVisibilitySettings(visibilityContainer)

    // 3. Calendar/Timestamp Type Colors Section
    containerEl.createEl('h3', { text: 'Default Colors for Timestamp Types (Calendars)' })

    const typeContainer = containerEl.createDiv({ cls: 'gantt-settings-container' })
    this.renderMapSettings(
      typeContainer,
      this.plugin.settings.typeColors,
      'New type (e.g., mayan)',
      '#2e7d32',
      true // Pass true to synchronize added types to the visibility record automatically
    )

    // 4. Group Colors Section
    containerEl.createEl('h3', { text: 'Default Colors for Groups' })

    const groupContainer = containerEl.createDiv({ cls: 'gantt-settings-container' })
    this.renderMapSettings(
      groupContainer,
      this.plugin.settings.groupColors,
      'New group (e.g., Quest)',
      '#ff8f00',
      false
    )
  }

  /**
   * Renders a list of checkbox toggles for each calendar type found in typeColors
   */
  private renderVisibilitySettings(container: HTMLElement) {
    const definedTypes = Object.keys(this.plugin.settings.typeColors)

    // Ensure defaultType is always available to toggle even if no custom color is added yet
    if (!definedTypes.includes(this.plugin.settings.defaultType)) {
      definedTypes.push(this.plugin.settings.defaultType)
    }

    if (definedTypes.length === 0) {
      container.createEl('span', {
        text: 'No custom calendar types added yet. Add an assignment below to filter visibility.',
        attr: { style: 'font-style: italic; color: var(--text-muted);' }
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
    const listEl = container.createDiv({ cls: 'gantt-settings-list' })

    // Render existing records
    Object.entries(record).forEach(([key, colorValue]) => {
      const row = listEl.createDiv({ cls: 'gantt-settings-row', attr: { style: 'display: flex; gap: 10px; margin-bottom: 5px; align-items: center;' } })

      row.createEl('span', { text: key, attr: { style: 'flex-grow: 1; font-weight: bold;' } })

      const picker = row.createEl('input', { attr: { type: 'color', value: colorValue } })
      picker.addEventListener('change', async (e) => {
        record[key] = (e.target as HTMLInputElement).value
        await this.plugin.saveSettings()
      })

      const deleteBtn = row.createEl('button', { text: 'Delete', cls: 'mod-warning' })
      deleteBtn.addEventListener('click', async () => {
        delete record[key]
        if (syncToVisibility && this.plugin.settings.visibleCalendars[key] !== undefined) {
          delete this.plugin.settings.visibleCalendars[key]
        }
        await this.plugin.saveSettings()
        this.display() // Refresh UI layout
      })
    })

    // Add new row UI block
    new Setting(container)
      .setName('Add Assignment')
      .setDesc('Add a new key and assign its default color.')
      .addText(text => {
        text.setPlaceholder(placeholderText)

        const textEl = text.inputEl
        const parentSetting = textEl.parentElement?.parentElement

        if (parentSetting) {
          const picker = parentSetting.createEl('input', { attr: { type: 'color', value: defaultColor, style: 'margin: 0 10px;' }})
          const addBtn = parentSetting.createEl('button', { text: 'Add', cls: 'mod-cta' })

          addBtn.addEventListener('click', async () => {
            const key = text.getValue().trim()
            if (key && !record[key]) {
              record[key] = picker.value

              if (syncToVisibility) {
                this.plugin.settings.visibleCalendars[key] = true
              }

              await this.plugin.saveSettings()
              this.display()
            }
          })
        }
      })
  }
}
