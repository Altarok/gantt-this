import {ColorComponent, Notice, PluginSettingTab, Setting, SettingDefinitionItem} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {ControlKeyMapped, GanttItemDisplayTypes, GroupOrCalendarSettings} from '../const/types'
import {DEFAULT_FALLBACK_CALENDAR, DEFAULT_FALLBACK_GROUP, DEFAULT_SETTINGS} from '../const/default-values'
import {AddEntryModal} from './settings-cal-grp-creation'
import {SettingsUtil} from './settings-util'
import {createFrontMatterSettingDefinitions} from './settings-subpage-frontmatter'
import {createPixelMagicSettings} from './settings-subpage-pixelmagic'
import {createWorkspaceSettings} from './settings-subpage-workspace'

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

      /* Size of events, event rows, and icons */
      createPixelMagicSettings(),
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

  private createAdvancedUxSettingDefinition(): SettingDefinitionItem {
    const items: SettingDefinitionItem[] = [
      {
        heading: 'Events',
        type: 'group',
        items: [
          {
            name: 'Symbol',
            desc: `Default symbol for timestamp events. Override with property: '${this.settings.frontMatterProperty_event_symbol}'`,
            control: {
              type: 'dropdown', key: 'uxDefaultTimestampEventSymbol',
              options: SettingsUtil.toRecord(GanttItemDisplayTypes.GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESTAMP),
              defaultValue: DEFAULT_SETTINGS.uxDefaultTimestampEventSymbol
            }
          },
          {
            name: 'Calendar',
            desc: `Default calendar for events. Override with property: '${this.settings.frontMatterProperty_event_calendar}'`,
            control: {
              type: 'dropdown', key: 'defaultCalendar',
              options: SettingsUtil.toRecord(this.settings.calendars.map(c => c.id)),
              defaultValue: DEFAULT_SETTINGS.defaultCalendar
            }
          },
          {
            name: 'Group',
            desc: `Default group for events. Override with property: '${this.settings.frontMatterProperty_event_group}'`,
            control: {
              type: 'dropdown', key: 'defaultGroup',
              options: SettingsUtil.toRecord(this.settings.groups.map(g => g.id)),
              defaultValue: DEFAULT_SETTINGS.defaultGroup
            }
          },
          {
            name: 'Color',
            desc: `Default color for events. Used when not given in property: '${this.settings.frontMatterProperty_event_color}'`,
            control: {type: 'color', key: 'fallbackColor', defaultValue: DEFAULT_SETTINGS.fallbackColor}
          },
          {
            name: 'Icon color',
            desc: `Default color for event icons. Used when not given in property: '${this.settings.frontMatterProperty_event_icon_color}'`,
            control: {type: 'color', key: 'fallbackColorForIcons', defaultValue: DEFAULT_SETTINGS.fallbackColorForIcons}
          },
          {
            name: 'Vertical line width',
            desc: 'Set the line stroke width (in pixels) for vertical line events.',
            control: {
              type: 'slider', key: 'uxVerticalLineEventWidth',
              min: 1, max: 10, step: 1, defaultValue: DEFAULT_SETTINGS.uxVerticalLineEventWidth
            }
          },
          {
            name: 'Filename as start date',
            desc: 'Use filename as fallback start date. May be of use for daily notes. Experimental - use with care!',
            visible: false,
            control: {
              type: 'toggle', key: 'useFilenameAsFallbackStartDate',
              defaultValue: DEFAULT_SETTINGS.useFilenameAsFallbackStartDate,
              disabled: true
            }
          },
        ]
      },
      {
        heading: 'Event overlay',
        type: 'group',
        items: [
          {
            name: 'Highlight event',
            desc: 'Highlight hovered events with a bounding box.',
            control: {
              type: 'toggle', key: 'mouseOverEventShowBox', defaultValue: DEFAULT_SETTINGS.mouseOverEventShowBox
            }
          },
          {
            name: 'Highlight related events',
            desc: `If activated, the frontmatter properties '${this.settings.frontMatterProperty_event_predecessors}'
             and '${this.settings.frontMatterProperty_event_successors}' will get checked against the names of other Gantt event notes.
              Hovering one event will then highlight related events.`,
            control: {
              type: 'toggle', key: 'uxHighlightRelatedEvents', defaultValue: DEFAULT_SETTINGS.uxHighlightRelatedEvents
            }
          },
          {
            name: 'Connect related events',
            desc: `Activating this connects related events with directional arrows. See previous setting 'Highlight related events' for relation logic.`,
            control: {
              type: 'toggle',
              key: 'uxConnectRelatedEvents',
              defaultValue: DEFAULT_SETTINGS.uxConnectRelatedEvents,
              disabled: () => !this.settings.uxHighlightRelatedEvents
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
            name: 'Color', desc: 'Color for overlay.',
            control: {
              type: 'color', key: 'uxVerticalOverlayColor', defaultValue: DEFAULT_SETTINGS.uxVerticalOverlayColor,
            },
          },
          {
            name: 'Tooltip: Opacity', desc: '',
            visible: false,
            control: {
              type: 'slider', key: 'uxTooltipOpacity',
              min: 0, max: 1, step: 0.1,
              defaultValue: DEFAULT_SETTINGS.uxTooltipOpacity
            }
          },
          {
            name: 'Tooltip: Absolute day', desc: 'Add absolute day to tooltip title. Useful for comparing calendars.',
            control: {
              type: 'toggle', key: 'uxAddDaySuffixToTooltipTitle',
              defaultValue: DEFAULT_SETTINGS.uxAddDaySuffixToTooltipTitle
            }
          }
        ]
      },
      {
        heading: 'Zooming and Panning',
        type: 'group',
        items: [
          {
            name: 'Restrict minimum and maximum zoom',
            desc: 'Maximum zoom shows 4 adjacent days, minimum zoom fits your complete dataset.',
            control: {
              type: 'toggle', key: 'autoRestrictZoom', defaultValue: DEFAULT_SETTINGS.autoRestrictZoom
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
            desc: 'Display pan and zoom navigation buttons in the chart toolbar.',
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
            name: 'Show group visibility toggles',
            desc: 'Display eye icons in the toolbar to toggle group visibility.',
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
          }, {
            name: 'Move Toolbar down',
            desc: 'Displays toolbar below the Gantt chart.',
            control: {
              type: 'toggle', key: 'uxMoveToolbarBelowChart',
              defaultValue: DEFAULT_SETTINGS.uxMoveToolbarBelowChart
            }
          }, {
            name: 'Sticky Toolbar',
            desc: 'Keep toolbar visible when scrolling down.',
            control: {
              type: 'toggle', key: 'uxMakeToolbarSticky',
              defaultValue: DEFAULT_SETTINGS.uxMakeToolbarSticky
            }
          }, {
            name: 'Rerender cooldown (seconds)',
            desc: 'For those nerds changing files every second.',
            control: {
              type: 'slider', key: 'uxRerenderCooldownSeconds',
              min: 0, max: 30, step: 1,
              defaultValue: DEFAULT_SETTINGS.uxRerenderCooldownSeconds
            }
          },
        ]
      },

      // { // TODO #zoom-entire-svg-canvas
      //   name: 'Enable visual canvas zoom',
      //   desc: 'Scale the entire chart visually instead of adjusting the timeline date range.',
      //   control: {
      //     type: 'toggle',
      //     key: 'uxEnableVisualZoom',
      //     defaultValue: DEFAULT_SETTINGS.uxEnableVisualZoom
      //   }
      // },

      /*
       * TODO #hide-setting-groups
       */
      // {
      // name: 'Hide this group', desc: HIDEABLE_GROUP_DESCRIPTION,
      // control: { type: 'toggle', key: 'hideSettingsPageUx', defaultValue: DEFAULT_SETTINGS.hideSettingsPageUx }
      // }
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


}


export function isKnownCalendar(value: string, calendars: GroupOrCalendarSettings[]): boolean {
  if (!value || calendars?.length === 0) return false
  for (const cal of calendars)
    if (cal.id === value)
      return true
  return false
}

