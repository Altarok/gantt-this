import {ColorComponent, Notice, PluginSettingTab, Setting, SettingDefinitionItem} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {GroupOrCalendarSettings} from '../const/types'
import {DEFAULT_FALLBACK_CALENDAR, DEFAULT_FALLBACK_GROUP, DEFAULT_SETTINGS} from '../const/default-values'
import {AddEntryModal} from './settings-cal-grp-creation'
import {createFrontMatterSettingDefinitions} from './settings-subpage-frontmatter'
import {createWorkspaceSettings} from './settings-subpage-workspace'
import {createEventSettings} from './settings-subpage-events'
import {createChartSettingDefinition} from './settings-subpage-chart'

// const HIDEABLE_GROUP_DESCRIPTION = 'Once happy with your settings, you may hide this group. It will fold itself into a sub-page after reloading the app.'
const VISIBLE_ICON = 'eye' /* an open eye */
const INVISIBLE_ICON = 'eye-off' /* an open eye, with strike-through */

export class FantasyGanttSettingTab extends PluginSettingTab {
  constructor(public readonly plugin: FantasyGanttPlugin) {
    super(plugin.app, plugin)
  }

  private get settings() {
    return this.plugin.settings
  }

  private openAddForm(target: 'groups' | 'calendars') {

    const existingIds: string[] = target === 'groups'
      ? this.settings.groups.map(g => g.id)
      : this.settings.calendars.map(c => c.id)

    new AddEntryModal(this.plugin, existingIds, (entry) => {
      const list = this.settings[target]
      // Set priority to the end of the current list
      const newEntry = {...entry, priority: list.length}

      list.push(newEntry)

      void this.plugin.saveData(this.settings).then(() => this.update())
    }).open()
  }

  /*
   * https://docs.obsidian.md/Plugins/User+interface/Settings
   *
   * https://docs.obsidian.md/plugins/guides/migrate-declarative-settings
   */
  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      /* Source paths for input */
      this.createDataSourceSelectionGroup(),

      /* Calendar list */
      this.createCalendarList(),
      /* Group list */
      this.createGroupList(),

      {
        heading: 'Default Values',
        type: 'group',
      },

      createEventSettings(this.settings),

      {
        heading: 'Controls',
        type: 'group',
      },

      /* Advanced UX settings */
      createChartSettingDefinition(this.settings),
      // /* Size of events, event rows, and icons */
      // createPixelMagicSettings(),

      {
        heading: 'Advanced',
        type: 'group'
      },

      /* FrontMatter property names */
      createFrontMatterSettingDefinitions(this.settings),
      /* Add ribbon icons and commands */
      createWorkspaceSettings()

    ]
  }

  private createDataSourceSelectionGroup(): SettingDefinitionItem {
    return {
      heading: 'Data paths',
      type: 'group',
      items: [
        {
          name: 'Event path',
          desc: 'Folder to search for event definitions. Can be overwritten for each chart.',
          control: {type: 'folder', key: 'eventPath', includeRoot: true, defaultValue: DEFAULT_SETTINGS.eventPath}
        },
        {
          name: 'Search recursively',
          desc: 'Search sub-folders of event path.',
          control: {type: 'toggle', key: 'eventPathSearchRecursive'}
        },
        {
          name: 'Calendar path',
          desc: 'Folder to search for calendar definitions.  Can be overwritten for each chart.',
          control: {type: 'folder', key: 'calendarPath', includeRoot: true, defaultValue: DEFAULT_SETTINGS.calendarPath}
        },
        {
          name: 'Search recursively',
          desc: 'Search sub-folders of calendar path.',
          control: {type: 'toggle', key: 'calendarPathSearchRecursive'}
        }
      ]
    }
  }

  private createCalendarList(): SettingDefinitionItem {
    return {
      heading: 'Calendars',
      type: 'list',
      desc: 'Control calendar visibility, color, and order of appearance.',
      emptyState: 'No calendar defined yet.',
      addItem: {name: 'Add calendar', action: () => this.openAddForm('calendars')},
      onReorder: (oldIndex: number, newIndex: number) => {
        const [moved] = this.settings.calendars.splice(oldIndex, 1)
        if (moved) {
          this.settings.calendars.splice(newIndex, 0, moved)
          this.settings.calendars.forEach((cal, index) => cal.priority = index)
          void (async () => {
            await this.plugin.saveSettings()
            this.update()
          })()
        }
      },
      onDelete: (idx: number) => this.handleDelete(this.settings.calendars, idx, this.settings.defaultCalendar, DEFAULT_FALLBACK_CALENDAR, 'calendar'),
      items: this.settings.calendars.map((cal) => ({
        name: cal.id,
        render: (setting: Setting) => this.renderItemRow(setting, cal)
      }))
    }
  }

  private createGroupList(): SettingDefinitionItem {
    return {
      heading: 'Groups',
      type: 'list',
      desc: 'Control group visibility, color and order of appearance.',
      emptyState: 'No group defined yet.',
      addItem: {name: 'Add group', action: () => this.openAddForm('groups')},
      onReorder: (oldIndex: number, newIndex: number) => {
        const [moved] = this.settings.groups.splice(oldIndex, 1)
        if (moved) {
          this.settings.groups.splice(newIndex, 0, moved)
          this.settings.groups.forEach((grp, index) => grp.priority = index)
          void (async () => {
            await this.plugin.saveSettings()
            this.update()
          })()
        }
      },
      onDelete: (idx: number) => this.handleDelete(this.settings.groups, idx, this.settings.defaultGroup, DEFAULT_FALLBACK_GROUP, 'group'),
      items: this.settings.groups.map((group) => ({
        name: group.id,
        render: (setting: Setting) => this.renderItemRow(setting, group)
      }))
    }
  }

  private handleDelete(list: GroupOrCalendarSettings[],
                       idx: number,
                       defaultId: string,
                       fallbackId: string,
                       typeName: string): void {
    const item = list[idx]
    if (!item) return
    if (item.id === defaultId) {
      new Notice(`Can't delete default ${typeName}!`)
      return
    }
    if (item.id === fallbackId) {
      new Notice(`Can't delete fallback ${typeName}!`)
      return
    }
    list.splice(idx, 1)
    void (async () => {
      await this.plugin.saveSettings()
      this.update()
    })()
  }

  private renderItemRow(setting: Setting, item: GroupOrCalendarSettings): void {
    let cc: ColorComponent
    setting
    .addButton(btn => btn.setIcon(item.visible ? VISIBLE_ICON : INVISIBLE_ICON).setTooltip('Click to toggle visibility', {delay: -1})
      .onClick(async () => {
        item.visible = !item.visible
        void btn.setIcon(item.visible ? VISIBLE_ICON : INVISIBLE_ICON)
        await this.plugin.saveSettings()
      })
    )
    .addColorPicker(c => cc = c
      .setValue(item.color ?? this.settings.fallbackColor)
      .onChange(async (value) => {
          item.color = value
          await this.plugin.saveSettings()
        }
      )
    )
    .addButton(btn => btn.setIcon('rotate-ccw').setTooltip('Reset color', {delay: -1})
      .onClick(async () => {
        cc.setValue(this.settings.fallbackColor)
        item.color = this.settings.fallbackColor
        await this.plugin.saveSettings()
      })
    )
  }

}
