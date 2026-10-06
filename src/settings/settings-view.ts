import {ColorComponent, Notice, PluginSettingTab, Setting, SettingDefinitionItem} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {GroupOrCalendarSettings} from '../const/types'
import {DEFAULT_FALLBACK_CALENDAR, DEFAULT_FALLBACK_GROUP, DEFAULT_SETTINGS} from '../const/default-values'
import {AddEntryModal} from './settings-cal-grp-creation'
import {createFrontMatterSettingDefinitions} from './settings-subpage-frontmatter'
import {createWorkspaceSettings} from './settings-subpage-workspace'
import {createEventSettings} from "./settings-subpage-events";
import {createAdvancedUxSettingDefinition} from "./settings-subpage-chart";

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

    const existingIds: string[] = (target === 'groups') ? this.settings.groups.map(g => g.id) : this.settings.calendars.map(c => c.id)

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
      createAdvancedUxSettingDefinition(this.settings),
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
        let [moved] = this.settings.calendars.splice(oldIndex, 1)
        if (moved) {
          this.settings.calendars.splice(newIndex, 0, moved)
          this.settings.calendars.forEach((cal, index) => cal.priority = index)
          void (async () => {
            await this.plugin.saveSettings()
            this.update()
          })()
        }
      },
      onDelete: (idx: number) => {
        const calendar: GroupOrCalendarSettings | undefined = this.settings.calendars[idx]
        if (!calendar) return
        if (calendar.id === this.settings.defaultCalendar) {
          new Notice(`Can't delete default calendar!`)
          return
        }
        if (calendar.id === DEFAULT_FALLBACK_CALENDAR) {
          new Notice(`Can't delete fallback calendar!`)
          return
        }
        this.settings.calendars.splice(idx, 1)
        void (async () => {
          await this.plugin.saveSettings()
          this.update()
        })()
      },
      items: this.settings.calendars.map((cal) => ({
        name: cal.id,
        searchable: false,
        render: (setting: Setting) => {
          let cc: ColorComponent
          setting
          .addButton(btn => btn.setIcon(cal.visible ? VISIBLE_ICON : INVISIBLE_ICON).setTooltip('Click to toggle visibility', {delay: -1})
            .onClick(async () => {
              cal.visible = !cal.visible
              void btn.setIcon(cal.visible ? VISIBLE_ICON : INVISIBLE_ICON)
              await this.plugin.saveSettings()
            })
          )
          .addColorPicker(c => cc = c
            .setValue(cal.color ?? this.settings.fallbackColor)
            .onChange(async (value) => {
                cal.color = value
                await this.plugin.saveSettings()
              }
            )
          )
          .addButton(btn => btn.setIcon('rotate-ccw').setTooltip('Reset color', {delay: -1})
            .onClick(async () => {
              cc.setValue(this.settings.fallbackColor)
              cal.color = this.settings.fallbackColor
              await this.plugin.saveSettings()
            })
          )
        },
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
        let [moved] = this.settings.groups.splice(oldIndex, 1)
        if (moved) {
          this.settings.groups.splice(newIndex, 0, moved)
          this.settings.groups.forEach((grp, index) => grp.priority = index)
          void (async () => {
            await this.plugin.saveSettings()
            this.update()
          })()
        }
      },
      onDelete: (idx: number) => {
        const group: GroupOrCalendarSettings | undefined = this.settings.groups[idx]
        if (!group) return
        if (group.id === this.settings.defaultGroup) {
          new Notice(`Can't delete default group!`)
          return
        }
        if (group.id === DEFAULT_FALLBACK_GROUP) {
          new Notice(`Can't delete fallback group!`)
          return
        }
        this.settings.groups.splice(idx, 1)
        void (async () => {
          await this.plugin.saveSettings()
          this.update()
        })()
      },
      items: this.settings.groups.map((group) => ({
        name: group.id,
        searchable: false,
        render: (setting: Setting) => {
          let cc: ColorComponent
          setting
          .addButton(btn => btn.setIcon(group.visible ? VISIBLE_ICON : INVISIBLE_ICON).setTooltip('Click to toggle visibility', {delay: -1})
            .onClick(async () => {
              group.visible = !group.visible
              void btn.setIcon(group.visible ? VISIBLE_ICON : INVISIBLE_ICON)
              await this.plugin.saveSettings()
            })
          )
          .addColorPicker(c => cc = c
            .setValue(group.color ?? this.settings.fallbackColor)
            .onChange(async (value) => {
                group.color = value
                await this.plugin.saveSettings()
              }
            )
          )
          .addButton(btn => btn.setIcon('rotate-ccw').setTooltip('Reset color', {delay: -1})
            .onClick(async () => {
              cc.setValue(this.settings.fallbackColor)
              group.color = this.settings.fallbackColor
              await this.plugin.saveSettings()
            })
          )
        },
      }))
    }
  }

}


export function isKnownCalendar(value: string, calendars: GroupOrCalendarSettings[]): boolean {
  if (!value || calendars?.length === 0) return false
  for (const cal of calendars)
    if (cal.id === value)
      return true
  return false
}

