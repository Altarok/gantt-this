import {App, ColorComponent, PluginSettingTab, Setting, SettingDefinitionItem} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {DEFAULT_SETTINGS, isCalendarIdentifier} from '../const/types'
import {AddEntryModal} from './settings-util'

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

    const openAddForm = (target: 'groups' | 'calendars') => {
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
        heading: 'Define source paths for your Events and Calendars',
        type: 'group',
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
        heading: 'Default values',
        type: 'group',
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
            desc: `Fallback value for event property '${this.plugin.settings.frontMatterProperty_event_color}'.`,
            control: {
              type: 'color', key: 'fallbackColor',
              defaultValue: DEFAULT_SETTINGS.fallbackColor
            }
          },
          {
            name: 'Default icon color',
            desc: `Fallback value for event property '${this.plugin.settings.frontMatterProperty_event_icon_color}'.`,
            control: {
              type: 'color', key: 'fallbackColorForIcons',
              defaultValue: DEFAULT_SETTINGS.fallbackColorForIcons
            }
          }
        ]
      },
      /* Calendar list */
      {
        heading: 'Calendars',
        type: 'list',
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
        heading: 'Groups',
        type: 'list',
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
        name: 'Advanced UX settings', type: 'page',
        desc: 'Configure front-matter properties the plugin uses',
        items: [
          {
            name: 'Add ribbon icon?',
            desc: 'This would give you a live preview of the chart during setup.',
            control: {
              type: 'toggle', key: 'uxAddRibbonIcon',
              defaultValue: DEFAULT_SETTINGS.uxAddRibbonIcon
            }
          },
          {
            name: 'Add plugin commands?',
            desc: 'Commands would create templates for events, calendars and Markdown code blocks.',
            control: {
              type: 'toggle', key: 'uxAddCommands',
              defaultValue: DEFAULT_SETTINGS.uxAddCommands
            }
          },
          {
            name: 'Show overlay box?',
            desc: 'Show box around events when hovered over.',
            control: {
              type: 'toggle', key: 'mouseOverEventShowBox',
              defaultValue: DEFAULT_SETTINGS.mouseOverEventShowBox
            }
          },
          {
            name: 'Show overlay vertical?',
            desc: 'Show vertical line over events when hovered over. Use for date comparison.',
            control: {
              type: 'toggle', key: 'mouseOverEventShowVerticalLine',
              defaultValue: DEFAULT_SETTINGS.mouseOverEventShowVerticalLine
            }
          },
          {
            name: 'Extend toolbar with buttons to hide groups individually',
            control: {
              type: 'toggle', key: 'showButtonsToHideGroups',
              defaultValue: DEFAULT_SETTINGS.showButtonsToHideGroups
            }
          },
          {
            name: 'Automatically restrict min & max zoom?',
            control: {
              type: 'toggle', key: 'autoRestrictZoom',
              defaultValue: DEFAULT_SETTINGS.autoRestrictZoom
            }
          },
          {
            name: 'Override default scroll in calendar?',
            desc: 'By default scrolling over a calendar zooms in or out. If deactivated, you must hold Shift.',
            control: {
              type: 'toggle', key: 'uxOverrideNoteScrollInCalendar',
              defaultValue: DEFAULT_SETTINGS.uxOverrideNoteScrollInCalendar
            }
          },
          {
            name: 'Switch zoom and pan control?',
            desc: 'By default scrolling zooms and Ctrl+scrolling pans. Activate to switch.',
            control: {
              type: 'toggle', key: 'uxSwitchZoomAndPan',
              defaultValue: DEFAULT_SETTINGS.uxSwitchZoomAndPan
            }
          },
          {
            name: 'Apply calendar color to calendar axis?',
            desc: 'This might be visually distracting.',
            control: {
              type: 'toggle', key: 'uxUseCalColorForCalAxis',
              defaultValue: DEFAULT_SETTINGS.uxUseCalColorForCalAxis
            }
          },
          {
            name: 'Width of vertical line events.',
            control: {
              type: 'slider', key: 'uxVerticalLineEventWidth',
              min: 1, max: 10, step: 1, defaultValue: DEFAULT_SETTINGS.uxVerticalLineEventWidth
            }
          }
        ]
      },
      /* FrontMatter property names */
      this.createFrontMatterSettingDefinitions(),

    ]
  }

  createFrontMatterSettingDefinitions(): SettingDefinitionItem {
    return {
      name: 'Front-matter properties', type: 'page',
      desc: 'Configure front-matter properties the plugin uses',
      items: [
        {
          name: 'This marks a note as Gantt event',
          desc: 'Mandatory. Main FrontMatter property the plugin searches for',
          control: {
            type: 'text',
            key: 'frontMatterProperty_gantt_this',
            placeholder: DEFAULT_SETTINGS.frontMatterProperty_gantt_this,
            defaultValue: DEFAULT_SETTINGS.frontMatterProperty_gantt_this,
            validate: (value: string) => testFrontMatterInput(value)
          },
        },
        {
          name: 'Calendar definition',
          desc: 'Name of calendar',
          control: {
            type: 'text', key: 'frontMatterProperty_calendar_name',
            placeholder: DEFAULT_SETTINGS.frontMatterProperty_calendar_name,
            defaultValue: DEFAULT_SETTINGS.frontMatterProperty_calendar_name,
            validate: (value: string) => testFrontMatterInput(value)
          },
        },
        {
          name: 'Event calendar',
          desc: 'Optional. Defines which calendar to apply this event to',
          control: {
            type: 'text', key: 'frontMatterProperty_event_calendar',
            placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_calendar,
            defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_calendar,
            validate: (value: string) => testFrontMatterInput(value)
          },
        },
        {
          name: 'Event name',
          desc: 'Optional. Name of event',
          control: {
            type: 'text', key: 'frontMatterProperty_event_name',
            placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_name,
            defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_name,
            validate: (value: string) => testFrontMatterInput(value)
          },
        },
        {
          name: 'Event start date',
          desc: 'Mandatory',
          control: {
            type: 'text', key: 'frontMatterProperty_event_time_start',
            placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_time_start,
            defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_time_start,
            validate: (value: string) => testFrontMatterInput(value)
          },
        },
        {
          name: 'Event end date',
          desc: 'Optional',
          control: {
            type: 'text', key: 'frontMatterProperty_event_time_end',
            placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_time_end,
            defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_time_end,
            validate: (value: string) => testFrontMatterInput(value)
          },
        },
        {
          name: 'Event color',
          desc: 'Optional. Hex color or human-readable name.',
          control: {
            type: 'text', key: 'frontMatterProperty_event_color',
            placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_color,
            defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_color,
            validate: (value: string) => testFrontMatterInput(value)
          },
        },
        {
          name: 'Event group',
          desc: 'Optional. Use to sort, group and color depending on group.',
          control: {
            type: 'text', key: 'frontMatterProperty_event_group',
            placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_group,
            defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_group,
            validate: (value: string) => testFrontMatterInput(value)
          },
        },
        {
          name: 'Event symbol',
          desc: 'Optional.',
          control: {
            type: 'text', key: 'frontMatterProperty_event_symbol',
            placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_symbol,
            defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_symbol,
            validate: (value: string) => testFrontMatterInput(value)
          },
        },
        {
          name: 'Event icon name',
          desc: 'Optional. Name of icon, see https://lucide.dev',
          control: {
            type: 'text', key: 'frontMatterProperty_event_icon_name',
            placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_icon_name,
            defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_icon_name,
            validate: (value: string) => testFrontMatterInput(value)
          },
        },
        {
          name: 'Event icon color',
          desc: 'Optional. Hex color or human-readable name',
          control: {
            type: 'text', key: 'frontMatterProperty_event_icon_color',
            placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_icon_color,
            defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_icon_color,
            validate: (value: string) => testFrontMatterInput(value)
          }
        },
        {
          name: 'Header in note',
          desc: 'Optional. Clicking the event will point to header instead of file.',
          control: {
            type: 'text', key: 'frontMatterProperty_note_header',
            placeholder: DEFAULT_SETTINGS.frontMatterProperty_note_header,
            defaultValue: DEFAULT_SETTINGS.frontMatterProperty_note_header,
            validate: (value: string) => testFrontMatterInput(value)
          }
        }
      ]
    }
  }

}

// void (async () => {
//   await this.plugin.saveSettings()
//   this.update()
// })()
