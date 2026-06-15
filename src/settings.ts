import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

export interface FantasyGanttSettings {
  defaultType: string;
  fallbackColor: string;
  typeColors: Record<string, string>;   // Map for calendar type colors (e.g., "iso-8601": "#2e7d32")
  groupColors: Record<string, string>;  // Map for group colors (e.g., "Quest": "#ff8f00")
}

export const DEFAULT_SETTINGS: FantasyGanttSettings = {
  defaultType: 'iso-8601',
  fallbackColor: '#1565c0',
  typeColors: {},
  groupColors: {}
};

export class FantasyGanttSettingTab extends PluginSettingTab {
  plugin: any; // Using any here so it interfaces easily with your main plugin instance

  constructor(app: App, plugin: Plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Fantasy Gantt Plugin Settings' });

    // 1. General Settings Section
    new Setting(containerEl)
      .setName('Default Timestamp Type')
      .setDesc('The fallback value for gantt-type if it is not explicitly defined in a file.')
      .addText(text => text
        .setPlaceholder('iso-8601')
        .setValue(this.plugin.settings.defaultType)
        .onChange(async (value) => {
          this.plugin.settings.defaultType = value.trim() || 'iso-8601';
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Global Fallback Color')
      .setDesc('Used when no color is defined in the item frontmatter, its group, or its calendar type.')
      .addColorPicker(color => color
        .setValue(this.plugin.settings.fallbackColor)
        .onChange(async (value) => {
          this.plugin.settings.fallbackColor = value;
          await this.plugin.saveSettings();
        }));

    // 2. Calendar/Timestamp Type Colors Section
    containerEl.createEl('h3', { text: 'Default Colors for Timestamp Types (Calendars)' });

    // UI to add a new type color mapping
    const typeContainer = containerEl.createDiv({ cls: 'gantt-settings-container' });
    this.renderMapSettings(
      typeContainer,
      this.plugin.settings.typeColors,
      'New type (e.g., mayan)',
      '#2e7d32'
    );

    // 3. Group Colors Section
    containerEl.createEl('h3', { text: 'Default Colors for Groups' });

    // UI to add a new group color mapping
    const groupContainer = containerEl.createDiv({ cls: 'gantt-settings-container' });
    this.renderMapSettings(
      groupContainer,
      this.plugin.settings.groupColors,
      'New group (e.g., Quest)',
      '#ff8f00'
    );
  }

  /**
   * Helper function to dynamically render key-value dynamic color records with an add/delete flow
   */
  private renderMapSettings(
    container: HTMLElement,
    record: Record<string, string>,
    placeholderText: string,
    defaultColor: string
  ) {
    const listEl = container.createDiv({ cls: 'gantt-settings-list' });

    // Render existing records
    Object.entries(record).forEach(([key, colorValue]) => {
      const row = listEl.createDiv({ cls: 'gantt-settings-row', attr: { style: 'display: flex; gap: 10px; margin-bottom: 5px; align-items: center;' } });

      row.createEl('span', { text: key, attr: { style: 'flex-grow: 1; font-weight: bold;' } });

      const picker = row.createEl('input', { attr: { type: 'color', value: colorValue } });
      picker.addEventListener('change', async (e) => {
        record[key] = (e.target as HTMLInputElement).value;
        await this.plugin.saveSettings();
      });

      const deleteBtn = row.createEl('button', { text: 'Delete', cls: 'mod-warning' });
      deleteBtn.addEventListener('click', async () => {
        delete record[key];
        await this.plugin.saveSettings();
        this.display(); // Refresh UI layout
      });
    });

    // Add new row UI block
    new Setting(container)
      .setName('Add Assignment')
      .setDesc('Add a new key and assign its default color.')
      .addText(text => {
        text.setPlaceholder(placeholderText);

        // Target container to bundle add actions cleanly
        const textEl = text.inputEl;
        const parentSetting = textEl.parentElement?.parentElement;

        if (parentSetting) {
          const picker = parentSetting.createEl('input', { attr: { type: 'color', value: defaultColor }, style: 'margin: 0 10px;' });
          const addBtn = parentSetting.createEl('button', { text: 'Add', cls: 'mod-cta' });

          addBtn.addEventListener('click', async () => {
            const key = text.getValue().trim();
            if (key && !record[key]) {
              record[key] = picker.value;
              await this.plugin.saveSettings();
              this.display();
            }
          });
        }
      });
  }
}
