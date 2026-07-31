import {App, ColorComponent, PluginSettingTab, Setting, SettingDefinitionItem} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {DEFAULT_SETTINGS, isCalendarIdentifier} from '../const/types'
import {AddEntryModal} from "./settings-util";

const VISIBLE_ICON = 'eye' /* an open eye */
const INVISIBLE_ICON = 'eye-off' /* an open eye, but with strike through */

/**
 * Validate FrontMatter input
 * @param value
 * @return undefined if the input is fine, otherwise a string explaining why it isn't
 */
function testFrontMatterInput(value: string): string | undefined {
  return /^[\w.-]+$/.test(value) ? undefined /* input OK */ : 'String must match ^[a-zA-Z0-9_.-]+$.' /* input NOK */
}

export class FantasyGanttSettingTab extends PluginSettingTab {

  constructor(app: App, public readonly plugin: FantasyGanttPlugin) {
    super(app, plugin)
  }

  /*
   * https://docs.obsidian.md/Plugins/User+interface/Settings
   *
   * https://docs.obsidian.md/plugins/guides/migrate-declarative-settings
   */
  getSettingDefinitions(): SettingDefinitionItem[] {

    const openAddForm = (target: "groups" | "calendars") => {
      new AddEntryModal(this.plugin, (entry) => {
        const list = this.plugin.settings[target]

        // Set priority to the end of the current list
        const newEntry = {...entry, priority: list.length}

        list.push(newEntry)

        void this.plugin.saveData(this.plugin.settings).then(() => this.update())
      }).open()
    }

    return [
      /* Source paths for input */
      {
        type: 'group',
        heading: 'Event and calendar source path selection',
        items: [
          {
            name: 'Folder to search for event definitions',
            desc: 'Can be searched recursively',
            control: {type: 'folder', key: 'eventPath', includeRoot: true}
          },
          {
            name: 'Search sub-folders?',
            control: {type: 'toggle', key: 'eventPathSearchRecursive'}
            // .setTooltip('Search recursively?', {delay: -1})
          },
          {
            name: 'Folder to search for calendar definitions',
            desc: 'Can be searched recursively',
            control: {type: 'folder', key: 'calendarPath', includeRoot: true}
          },
          {
            name: 'Search sub-folders?',
            control: {type: 'toggle', key: 'calendarPathSearchRecursive'}
            // .setTooltip('Search recursively?', {delay: -1})
          }
        ]
      },
      /* Default values */
      {
        type: 'group',
        heading: 'Default values',
        items: [
          {
            name: 'Default event calendar',
            desc: `Fallback value for event property 'gantt-type'. Default: ${DEFAULT_SETTINGS.defaultCalendar}`,
            control: {
              type: 'text',
              key: 'defaultCalendar',
              placeholder: DEFAULT_SETTINGS.defaultCalendar,
              validate: (value: string) => isCalendarIdentifier(value) ? undefined : 'Not a known calendar!'
            }
          },
          {
            name: 'Default event color',
            desc: `Fallback value for event property 'gantt-color'.`,
            control: {
              type: 'color',
              key: 'fallbackColor',
              // placeholder: DEFAULT_SETTINGS.fallbackColor,
            }
          }
        ]
      },
      /* Calendar list */
      {
        type: 'list',
        heading: 'Calendars',
        desc: 'Control calendar visibility, color and order or appearance.',
        emptyState: 'No calendar defined yet.',
        addItem: {name: 'Add calendar', action: () => openAddForm('calendars')},
        onReorder: (oldIndex: number, newIndex: number) => {
          let [moved] = this.plugin.settings.calendars.splice(oldIndex, 1)
          if (moved) {
            this.plugin.settings.calendars.splice(newIndex, 0, moved)
            this.plugin.settings.calendars.forEach((cal, index) => cal.priority = index)
            void (async () => {
              await this.plugin.saveSettings()
              this.update()
            })()
          }
        },
        onDelete: (idx: number) => {
          this.plugin.settings.calendars.splice(idx, 1)
          void (async () => {
            await this.plugin.saveSettings()
            this.update()
          })()
        },
        items: this.plugin.settings.calendars.map((cal) => ({
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
                .setValue(cal.color ?? this.plugin.settings.fallbackColor)
                .onChange(async (value) => {
                    cal.color = value
                    await this.plugin.saveSettings()
                  }
                )
              )
              .addButton(btn => btn.setIcon('rotate-ccw').setTooltip('Reset color', {delay: -1})
                .onClick(async () => {
                  cc.setValue(this.plugin.settings.fallbackColor)
                  cal.color = this.plugin.settings.fallbackColor
                  await this.plugin.saveSettings()
                })
              )
          },
        }))
      },
      /* Group list */
      {
        type: 'list',
        heading: 'Groups',
        desc: 'Control group visibility, color and order or appearance.',
        emptyState: 'No group defined yet.',
        addItem: {name: 'Add group', action: () => openAddForm('groups')},
        onReorder: (oldIndex: number, newIndex: number) => {
          let [moved] = this.plugin.settings.groups.splice(oldIndex, 1)
          if (moved) {
            this.plugin.settings.groups.splice(newIndex, 0, moved)
            this.plugin.settings.groups.forEach((grp, index) => grp.priority = index)
            void (async () => {
              await this.plugin.saveSettings()
              this.update()
            })()
          }
        },
        onDelete: (idx: number) => {
          this.plugin.settings.groups.splice(idx, 1)
          void (async () => {
            await this.plugin.saveSettings()
            this.update()
          })()
        },
        items: this.plugin.settings.groups.map((group) => ({
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
                .setValue(group.color ?? this.plugin.settings.fallbackColor)
                .onChange(async (value) => {
                    group.color = value
                    await this.plugin.saveSettings()
                  }
                )
              )
              .addButton(btn => btn.setIcon('rotate-ccw').setTooltip('Reset color', {delay: -1})
                .onClick(async () => {
                  cc.setValue(this.plugin.settings.fallbackColor)
                  group.color = this.plugin.settings.fallbackColor
                  await this.plugin.saveSettings()
                })
              )
          },
        }))
      },
      /* Advanced */
      {
        type: 'group',
        heading: 'Advanced',
        items: [
          {
            name: 'Show box around events when hovered over',
            control: {type: 'toggle', key: 'mouseOverEventShowBox'}
          },
          {
            name: 'Show vertical line over events when hovered over',
            control: {type: 'toggle', key: 'mouseOverEventShowVerticalLine'}
          },
          {
            name: 'Extend toolbar with buttons to hide groups individually',
            control: {type: 'toggle', key: 'showButtonsToHideGroups'}
          }
        ]
      },
      /* FrontMatter property names */
      {
        type: 'group',
        heading: 'FrontMatter property names',
        items: [
          {
            name: 'Override FrontMatter properties?',
            desc: 'Scroll down after activating',
            control: {type: 'toggle', key: 'frontMatterProperty_manual_override'},
          },
          {
            name: 'Boolean marking notes as Gantt events',
            desc: 'Mandatory. Main FrontMatter property the plugin searches for',
            visible: () => this.plugin.settings.frontMatterProperty_manual_override,
            control: {
              type: 'text',
              key: 'frontMatterProperty_gantt_this',
              placeholder: DEFAULT_SETTINGS.frontMatterProperty_gantt_this,
              validate: (value: string) => testFrontMatterInput(value)
            },
          },
          {
            name: 'Calendar definition',
            desc: 'Name of calendar',
            visible: () => this.plugin.settings.frontMatterProperty_manual_override,
            control: {
              type: 'text', key: 'frontMatterProperty_calendar_name',
              placeholder: DEFAULT_SETTINGS.frontMatterProperty_calendar_name,
              validate: (value: string) => testFrontMatterInput(value)
            },
          },
          {
            name: 'Event calendar',
            desc: 'Optional. Defines which calendar to apply this event to',
            visible: () => this.plugin.settings.frontMatterProperty_manual_override,
            control: {
              type: 'text', key: 'frontMatterProperty_event_calendar',
              placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_calendar,
              validate: (value: string) => testFrontMatterInput(value)
            },
          },
          {
            name: 'Event name',
            desc: 'Optional. Name of event',
            visible: () => this.plugin.settings.frontMatterProperty_manual_override,
            control: {
              type: 'text', key: 'frontMatterProperty_event_name',
              placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_name,
              validate: (value: string) => testFrontMatterInput(value)
            },
          },
          {
            name: 'Event start date',
            desc: 'Mandatory',
            visible: () => this.plugin.settings.frontMatterProperty_manual_override,
            control: {
              type: 'text', key: 'frontMatterProperty_event_time_start',
              placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_time_start,
              validate: (value: string) => testFrontMatterInput(value)
            },
          },
          {
            name: 'Event end date',
            desc: 'Optional',
            visible: () => this.plugin.settings.frontMatterProperty_manual_override,
            control: {
              type: 'text', key: 'frontMatterProperty_event_time_end',
              placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_time_end,
              validate: (value: string) => testFrontMatterInput(value)
            },
          },
          {
            name: 'Event color',
            desc: 'Optional. Hex color or human-readable name',
            visible: () => this.plugin.settings.frontMatterProperty_manual_override,
            control: {
              type: 'text', key: 'frontMatterProperty_event_color',
              placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_color,
              validate: (value: string) => testFrontMatterInput(value)
            },
          },
          {
            name: 'Event group',
            desc: 'Optional',
            visible: () => this.plugin.settings.frontMatterProperty_manual_override,
            control: {
              type: 'text', key: 'frontMatterProperty_event_group',
              placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_group,
              validate: (value: string) => testFrontMatterInput(value)
            },
          },
          {
            name: 'Event symbol',
            desc: 'Optional.',
            visible: () => this.plugin.settings.frontMatterProperty_manual_override,
            control: {
              type: 'text', key: 'frontMatterProperty_event_symbol',
              placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_symbol,
              validate: (value: string) => testFrontMatterInput(value)
            },
          },
          {
            name: 'Event icon name',
            desc: 'Optional. Name of icon, see https://lucide.dev',
            visible: () => this.plugin.settings.frontMatterProperty_manual_override,
            control: {
              type: 'text', key: 'frontMatterProperty_event_icon_name',
              placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_icon_name,
              validate: (value: string) => testFrontMatterInput(value)
            },
          },
          {
            name: 'Event icon color',
            desc: 'Optional. Hex color or human-readable name',
            visible: () => this.plugin.settings.frontMatterProperty_manual_override,
            control: {
              type: 'text', key: 'frontMatterProperty_event_icon_color',
              placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_icon_color,
              validate: (value: string) => testFrontMatterInput(value)
            },
          },
          {
            name: 'Header in note',
            desc: 'Optional. Clicking the event will point to header instead of file.',
            visible: () => this.plugin.settings.frontMatterProperty_manual_override,
            control: {
              type: 'text', key: 'frontMatterProperty_note_header',
              placeholder: DEFAULT_SETTINGS.frontMatterProperty_note_header,
              validate: (value: string) => testFrontMatterInput(value)
            },
          }
        ]
      },
    ]
  }

}
