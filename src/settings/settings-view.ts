import {ColorComponent, PluginSettingTab, Setting, SettingDefinition, SettingDefinitionItem} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {ControlKeyMapped, DEFAULT_SETTINGS, GanttItemDisplayTypes, GroupOrCalendarSettings} from '../const/types'
import {AddEntryModal} from './settings-util'

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
        heading: 'Advanced',
        type: 'group',
      },

      /* Advanced UX settings */
      this.createAdvancedUxSettingDefinition(),
      /* FrontMatter property names */
      this.createFrontMatterSettingDefinitions()
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

  private createAdvancedUxSettingDefinition(): SettingDefinitionItem {
    const items: SettingDefinitionItem[] = [
      {
        heading: 'Events',
        type: 'group',
        items: [
          {
            name: 'Symbol',
            desc: `Default symbol used for timestamp events. Used when not given in property: '${this.settings.frontMatterProperty_event_symbol}'`,
            control: {
              type: 'dropdown', key: 'uxDefaultTimestampEventSymbol',
              options: toRecord(GanttItemDisplayTypes.GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESTAMP),
              defaultValue: DEFAULT_SETTINGS.uxDefaultTimestampEventSymbol
            }
          },
          {
            name: 'Calendar',
            desc: `Default calendar used for events. Used when not given in property: ${this.settings.frontMatterProperty_event_calendar}'`,
            control: {
              type: 'text', key: 'defaultCalendar',
              placeholder: DEFAULT_SETTINGS.defaultCalendar, defaultValue: DEFAULT_SETTINGS.defaultCalendar,
              validate: (value: string) => isKnownCalendar(value, this.settings.calendars) ? undefined : 'Not a known calendar!'
            }
          },
          {
            name: 'Color',
            desc: `Default color for events. Used when not given in property: '${this.settings.frontMatterProperty_event_color}'`,
            control: {
              type: 'color', key: 'fallbackColor',
              defaultValue: DEFAULT_SETTINGS.fallbackColor
            }
          },
          {
            name: 'Icon color',
            desc: `Default color for event icons. Used when not given in property: '${this.settings.frontMatterProperty_event_icon_color}'`,
            control: {
              type: 'color', key: 'fallbackColorForIcons',
              defaultValue: DEFAULT_SETTINGS.fallbackColorForIcons
            }
          },
          {
            name: 'Vertical line width',
            desc: 'Set the line stroke width (in pixels) for vertical line events.',
            control: {
              type: 'slider', key: 'uxVerticalLineEventWidth',
              min: 1, max: 10, step: 1, defaultValue: DEFAULT_SETTINGS.uxVerticalLineEventWidth
            }
          }
        ]
      },
      {
        heading: 'Event overlay',
        type: 'group',
        items: [
          {
            name: 'Show overlay',
            desc: 'Highlight hovered events with a bounding box.',
            control: {
              type: 'toggle', key: 'mouseOverEventShowBox',
              defaultValue: DEFAULT_SETTINGS.mouseOverEventShowBox
            }
          },
          {
            name: 'Show vertical line',
            desc: 'Display a vertical guide line under the cursor for precise date comparison.',
            control: {
              type: 'toggle', key: 'mouseOverEventShowVerticalLine',
              defaultValue: DEFAULT_SETTINGS.mouseOverEventShowVerticalLine
            }
          },
          {
            name: 'Color',
            desc: 'Color for overlay.',
            control: {
              type: 'color', key: 'uxVerticalOverlayColor',
              defaultValue: DEFAULT_SETTINGS.uxVerticalOverlayColor,
            },
          },
        ]
      },
      {
        heading: 'Zooming and Panning',
        type: 'group',
        items: [
          {
            name: 'Restrict minimum and maximum zoom',
            desc: 'Maximum zoom shows adjacent days, minimum zoom fits your complete dataset.',
            control: {
              type: 'toggle', key: 'autoRestrictZoom',
              defaultValue: DEFAULT_SETTINGS.autoRestrictZoom
            }
          },
          {
            name: 'Zoom key',
            desc: 'Key to hold while scrolling to zoom in or out.',
            control: {
              type: 'dropdown', key: 'uxZoomButton', options: ControlKeyMapped,
              validate: value => (value !== this.settings.uxPanButton) ? undefined : 'Must differ from pan key.',
              defaultValue: DEFAULT_SETTINGS.uxZoomButton
            }
          },
          {
            name: 'Pan key',
            desc: 'Key to hold while scrolling to pan horizontally.',
            control: {
              type: 'dropdown', key: 'uxPanButton', options: ControlKeyMapped,
              validate: value => (value !== this.settings.uxZoomButton) ? undefined : 'Must differ from zoom key.',
              defaultValue: DEFAULT_SETTINGS.uxPanButton
            }
          },
          {
            name: 'Zoom and pan buttons',
            desc: 'Adds 4 buttons to chart toolbar: pan left, zoom out, zoom in, and pan right',
            control: {
              type: 'toggle', key: 'showPanAndZoomButtonsInToolbar',
              defaultValue: DEFAULT_SETTINGS.showPanAndZoomButtonsInToolbar
            }
          }
        ]
      },
      {
        heading: 'Gantt chart',
        type: 'group',
        items: [
          {
            name: 'Moons',
            desc: 'Show moons on calendar axis.',
            control: {
              type: 'toggle', key: 'uxShowMoons',
              defaultValue: DEFAULT_SETTINGS.uxShowMoons
            }
          },
          {
            name: 'Group visibility toggles',
            desc: 'Add buttons to the toolbar for hiding or showing individual groups.',
            control: {
              type: 'toggle', key: 'showButtonsToHideGroups',
              defaultValue: DEFAULT_SETTINGS.showButtonsToHideGroups
            }
          },
          {
            name: 'Color-code calendar axis',
            desc: 'Apply the corresponding calendar color directly to the calendar axis.',
            control: {
              type: 'toggle', key: 'uxUseCalColorForCalAxis',
              defaultValue: DEFAULT_SETTINGS.uxUseCalColorForCalAxis
            }
          },
        ]
      },


      // { // TODO wip
      //   name: 'Enable visual canvas zoom',
      //   desc: 'Scale the entire chart visually instead of adjusting the timeline date range.',
      //   control: {
      //     type: 'toggle',
      //     key: 'uxEnableVisualZoom',
      //     defaultValue: DEFAULT_SETTINGS.uxEnableVisualZoom
      //   }
      // },

      /*
       * TODO activate once users are satisfied
       */
      // {
      // name: 'Hide this group', desc: HIDEABLE_GROUP_DESCRIPTION,
      // control: { type: 'toggle', key: 'hideSettingsPageUx', defaultValue: DEFAULT_SETTINGS.hideSettingsPageUx }
      // }
      {
        heading: 'Plugin',
        type: 'group',
        items: [
          {
            name: 'Add ribbon icon',
            // TODO more options to come
            desc: 'Adds a ribbon icon to quickly open a live chart preview.',
            control: {
              type: 'toggle', key: 'uxAddRibbonIcon',
              defaultValue: DEFAULT_SETTINGS.uxAddRibbonIcon
            }
          },
          {
            name: 'Add plugin commands',
            desc: 'Adds commands to insert event properties, calendar definitions, and code blocks.',
            control: {
              type: 'toggle', key: 'uxAddCommands',
              disabled: true,
              defaultValue: DEFAULT_SETTINGS.uxAddCommands
            }
          }
        ]
      }

    ]

    // if (this.settings.hideSettingsPageUx)
    return {
      type: 'page',
      name: 'Display and controls',
      desc: 'Change the UI to your liking.',
      items
    }
    // else return {
    //   type: 'group',
    //   heading: 'Display and controls',
    //   desc: 'Change the UI to your liking.',
    //   items: items
    // }
  }

  private createFrontMatterSettingDefinitions(): SettingDefinitionItem {

    const items: SettingDefinition[] = [
      {
        name: 'Gantt event marker',
        desc: 'Primary frontmatter property used to identify Gantt events. Can be disabled using the toggle below.',
        control: {
          type: 'text',
          key: 'frontMatterProperty_gantt_this',
          placeholder: DEFAULT_SETTINGS.frontMatterProperty_gantt_this,
          defaultValue: DEFAULT_SETTINGS.frontMatterProperty_gantt_this,
          disabled: () => this.settings.frontMatterProperty_gantt_this_optional,
          validate: (value: string) => testFrontMatterInput(value)
        },
      },
      {
        name: 'Make Gantt event marker optional',
        desc: 'Enabling this saves one property per file, but offers less control.',
        control: {
          type: 'toggle', key: 'frontMatterProperty_gantt_this_optional',
          defaultValue: DEFAULT_SETTINGS.frontMatterProperty_gantt_this_optional
        }
      },
      {
        name: 'Calendar definition',
        desc: 'Property name used to identify calendar definition files.',
        control: {
          type: 'text', key: 'frontMatterProperty_calendar_name',
          placeholder: DEFAULT_SETTINGS.frontMatterProperty_calendar_name,
          defaultValue: DEFAULT_SETTINGS.frontMatterProperty_calendar_name,
          validate: (value: string) => testFrontMatterInput(value)
        },
      },
      {
        name: 'Event calendar',
        desc: 'Optional. Defines which calendar to apply this event to.',
        control: {
          type: 'text', key: 'frontMatterProperty_event_calendar',
          placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_calendar,
          defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_calendar,
          validate: (value: string) => testFrontMatterInput(value)
        },
      },
      {
        name: 'Event name',
        desc: 'Optional. Name of the event.',
        control: {
          type: 'text', key: 'frontMatterProperty_event_name',
          placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_name,
          defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_name,
          validate: (value: string) => testFrontMatterInput(value)
        },
      },
      {
        name: 'Event start date',
        desc: 'Mandatory property defining event start dates.',
        control: {
          type: 'text', key: 'frontMatterProperty_event_time_start',
          placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_time_start,
          defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_time_start,
          validate: (value: string) => testFrontMatterInput(value)
        },
      },
      {
        name: 'Event end date',
        desc: 'Optional property defining event end dates.',
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
        desc: 'Optional. Used to sort, group, and color events.',
        control: {
          type: 'text', key: 'frontMatterProperty_event_group',
          placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_group,
          defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_group,
          validate: (value: string) => testFrontMatterInput(value)
        },
      },
      {
        name: 'Event symbol',
        desc: 'Optional property overriding the event symbol.',
        control: {
          type: 'text', key: 'frontMatterProperty_event_symbol',
          placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_symbol,
          defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_symbol,
          validate: (value: string) => testFrontMatterInput(value)
        },
      },
      {
        name: 'Event icon name',
        desc: 'Optional. Name of the Lucide icon (see https://lucide.dev).',
        control: {
          type: 'text', key: 'frontMatterProperty_event_icon_name',
          placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_icon_name,
          defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_icon_name,
          validate: (value: string) => testFrontMatterInput(value)
        },
      },
      {
        name: 'Event icon color',
        desc: 'Optional. Hex color or human-readable name.',
        control: {
          type: 'text', key: 'frontMatterProperty_event_icon_color',
          placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_icon_color,
          defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_icon_color,
          validate: (value: string) => testFrontMatterInput(value)
        }
      },
      {
        name: 'Target Header',
        desc: 'Optional property. Clicking an event scrolls to this specific header within the note.',
        control: {
          type: 'text', key: 'frontMatterProperty_note_header',
          placeholder: DEFAULT_SETTINGS.frontMatterProperty_note_header,
          defaultValue: DEFAULT_SETTINGS.frontMatterProperty_note_header,
          validate: (value: string) => testFrontMatterInput(value)
        }
      },
      /*
       * TODO activate once users are satisfied
       */
      // {
      // name: 'Hide this group', desc: HIDEABLE_GROUP_DESCRIPTION,
      // control: { type: 'toggle', key: 'hideSettingsPageFrontmatterProperties', defaultValue: DEFAULT_SETTINGS.hideSettingsPageFrontmatterProperties  }
      // }
    ]

    if (this.settings.hideSettingsPageFrontmatterProperties) return {
      type: 'page',
      name: 'Frontmatter properties',
      desc: 'Rename frontmatter properties used by the plugin.',
      items: items
    }
    else return {
      type: 'group',
      heading: 'Frontmatter properties',
      items: items
    }
  }

}

/**
 * Validate FrontMatter input
 * @param value
 * @return undefined if the input is fine, otherwise a string explaining why it isn't
 */
function testFrontMatterInput(value: string): string | undefined {
  return /^[\w.-]+$/.test(value) ? undefined /* input OK */ : 'Key must only contain letters, numbers, hyphens, underscores, and dots.' /* input NOK */
}

function toRecord(strings: readonly string[]): Record<string, string> {
  return Object.fromEntries(strings.map((s) => [s, s]))
}

export function isKnownCalendar(value: string, calendars: GroupOrCalendarSettings[]): boolean {
  if (!value || calendars?.length === 0) return false
  for (const cal of calendars)
    if (cal.id === value)
      return true
  return false
}

