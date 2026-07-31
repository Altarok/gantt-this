import {App, PluginSettingTab, Setting} from 'obsidian'
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

// TODO rename
export class FantasyGanttSettingTab extends PluginSettingTab {

  constructor(app: App, public readonly plugin: FantasyGanttPlugin) {
    super(app, plugin)
  }

  display(): void {
    /* This is the old pre-1.13. version of settings */
  }

//    const {containerEl} = this
//    containerEl.empty()
//
//    /* Add event and calendar path source selection */
//    containerEl.createEl('h2', {text: 'Event and calendar source path selection'})
//    this.addDataSourceSettings(containerEl)
//
//    containerEl.createEl('h2', {text: 'Default values'})
//    this.addDefaultCalendarSelection(containerEl)
//    this.addDefaultColorSelection(containerEl)
//
//    containerEl.createEl('h3', {text: 'Calendar control'})
//    containerEl.createEl('div', {
//      text: 'Control which groups are visible on your timelines. If a calendar type is turned off here,' +
//        ' items belonging to that calendar type will be hidden.',
//      cls: Css.settings.itemDescription
//    })
//
//    void this.renderCalendarSettings(containerEl.createDiv({cls: Css.settings.calendarControl}))
//
//    containerEl.createEl('h3', {text: 'Group control'})
//    containerEl.createEl('div', {
//      text: 'Control group color and order or appearance.',
//      cls: Css.settings.itemDescription
//    })
//
//    void this.renderGroupSettings(containerEl.createDiv({cls: Css.settings.calendarControl}))
//
//    containerEl.createEl('h3', {text: 'Advanced settings'})
//
//    new Setting(containerEl).setName('Show box around events when hovered over')
//    .addToggle(t => t.setValue(this.plugin.settings.mouseOverEventShowBox)
//      .onChange(async (value) => {
//          this.plugin.settings.mouseOverEventShowBox = value
//          await this.plugin.saveSettings()
//        }
//      )
//    )
//
//    new Setting(containerEl).setName('Show vertical line over events when hovered over')
//    .addToggle(t => t.setValue(this.plugin.settings.mouseOverEventShowVerticalLine)
//      .onChange(async (value) => {
//          this.plugin.settings.mouseOverEventShowVerticalLine = value
//          await this.plugin.saveSettings()
//        }
//      )
//    )
//
//    new Setting(containerEl).setName('Extend toolbar with buttons to hide groups individually')
//    .addToggle(t => t.setValue(this.plugin.settings.showButtonsToHideGroups)
//      .onChange(async (value) => {
//          this.plugin.settings.showButtonsToHideGroups = value
//          await this.plugin.saveSettings()
//        }
//      )
//    )
//
//  }

//  private addDefaultColorSelection(containerEl: HTMLElement) {
//    new Setting(containerEl).setName('Default fallback color')
//    .setDesc('Used when no color is defined in the item front-matter, ' +
//      'its group, or its calendar type.')
//    .addColorPicker(color => color
//    .setValue(this.plugin.settings.fallbackColor)
//    .onChange(async (value) => {
//      this.plugin.settings.fallbackColor = value
//      await this.plugin.saveSettings()
//    }))
//  }

//  private addDefaultCalendarSelection(containerEl: HTMLElement) {
//    new Setting(containerEl).setName('Default calendar')
//    .setDesc('The fallback value for gantt-type if it is not explicitly defined in a file.')
//    .addText(text => text
//    .setPlaceholder('gregorian')
//    .setValue(this.plugin.settings.defaultCalendar)
//    .onChange(async (value) => {
//      const v = value.trim()
//      this.plugin.settings.defaultCalendar = isCalendarIdentifier(v) ? v : 'gregorian'
//      await this.plugin.saveSettings()
//    }))
//  }

//  private async renderCalendarSettings(mainCalendarContainer: HTMLElement) {
//
//    /**
//     * Saves settings, then empties and redraws the calendar overview table
//     */
//    const saveSettingsAndReRenderCalendarSettings = async (): Promise<void> => {
//      await this.plugin.saveSettings()
//      mainCalendarContainer.empty()
//      await this.renderCalendarSettings(mainCalendarContainer)
//    }
//
//    const {settings: pluginSettings} = this.plugin
//
//    let calendars: Record<string, GroupOrCalendarSettings> = pluginSettings.calendars
//
//    { /* Make sure that default values and priorities are given */
//      const defaultCalendar = pluginSettings.defaultCalendar
//      const knownCalendars = Object.keys(calendars)
//
//      if (!knownCalendars.includes(defaultCalendar)) {
//        calendars[defaultCalendar] = {'visible': true, 'color': pluginSettings.fallbackColor, 'priority': 0}
//      }
//    }
//
//    const priorities: { min: number, max: number, changed: boolean } = Priorities.fixPrioritiesIfNecessary(calendars)
//    if (priorities.changed) await this.plugin.saveSettings()
//    const sortedCalendarList: [string, GroupOrCalendarSettings][] = Priorities.sortGroupOrCalendarSettingsByPriority(calendars)
//
//    for (const [id, calendar] of sortedCalendarList) {
//
//      calendar.visible ??= false
//
//      const currPriority: number = calendar.priority!
//      const isHighestPriority = currPriority <= priorities.min
//      const isLowestPriority = currPriority >= priorities.max
//
//      const calSetting = new Setting(mainCalendarContainer).setName(`Calendar '${id}'`)
//      .setDesc('Change visibility, color and order or appearance')
//
//      addVisibilityToggleButton(calSetting, calendar.visible, async (value: boolean) => {
//          calendar.visible = value
//          await this.plugin.saveSettings()
//        }
//      )
//
//      addColorPickerFollowedByResetButton(calSetting, calendar.color ?? pluginSettings.fallbackColor, pluginSettings.fallbackColor,
//        async (value?: string) => {
//          calendar.color = value
//          await this.plugin.saveSettings()
//        }
//      )
//
//      addVerticalMovementButtonsForPriority(calSetting, isLowestPriority, isHighestPriority,
//        async () => {
//          const calendarSettings = Object.values(calendars).filter(x => x.priority === currPriority + 1)
//
//          if (calendarSettings?.length === 1 && Priorities.switchValues(calendar, calendarSettings[0]!)) {
//            await saveSettingsAndReRenderCalendarSettings()
//          } else {
//            new Notice(`Warn: can not find matching entry with priority '${currPriority + 1}'`)
//          }
//        },
//        async () => {
//          const calendarSettings = Object.values(calendars).filter(x => x.priority === currPriority - 1)
//
//          if (calendarSettings?.length === 1 && Priorities.switchValues(calendar, calendarSettings[0]!)) {
//            await saveSettingsAndReRenderCalendarSettings()
//          } else {
//            new Notice(`Warn: can not find matching entry with priority '${currPriority - 1}'`)
//          }
//        })
//
//      const isDefaultCalendar: boolean = id === pluginSettings.defaultCalendar
//
//      addDeleteButton(calSetting, !isDefaultCalendar, 'Can not delete default calendar', async () => {
//          delete pluginSettings.calendars[id]
//          await saveSettingsAndReRenderCalendarSettings()
//        }
//      )
//
//    } /* end of calendar loop  */
//
//    addCreateSetting(new Setting(mainCalendarContainer), 'calendar', async (calendarName: string) => {
//        if (!calendars[calendarName]) {
//          calendars[calendarName] = {
//            visible: true,
//            color: pluginSettings.fallbackColor,
//            priority: priorities.max + 1
//          }
//          await saveSettingsAndReRenderCalendarSettings()
//        }
//      }
//    )
//
//  } /* end of calendar setting group */

//  private async renderGroupSettings(mainGroupContainer: HTMLElement) {
//
//    /**
//     * Saves settings, then empties and redraws the calendar overview table
//     */
//    const saveSettingsAndReRenderGroupSettings = async (): Promise<void> => {
//      await this.plugin.saveSettings()
//      mainGroupContainer.empty()
//      await this.renderGroupSettings(mainGroupContainer)
//    }
//
//    const {settings: pluginSettings} = this.plugin
//
//    let groups: Record<string, GroupOrCalendarSettings> = pluginSettings.groups
//
//    const priorities: { min: number, max: number, changed: boolean } = Priorities.fixPrioritiesIfNecessary(groups)
//    if (priorities.changed) await this.plugin.saveSettings()
//    const sortedGroupList: [string, GroupOrCalendarSettings][] = Priorities.sortGroupOrCalendarSettingsByPriority(groups)
//
//    for (const [id, group] of sortedGroupList) {
//
//      group.visible ??= true
//
//      const currPriority: number = group.priority!
//      const isHighestPriority = currPriority <= priorities.min
//      const isLowestPriority = currPriority >= priorities.max
//
//      const groupSetting = new Setting(mainGroupContainer).setName(`Group '${id}'`)
//      .setDesc('Change visibility, color and order or appearance')
//
//      addVisibilityToggleButton(groupSetting, group.visible, async (value: boolean) => {
//          group.visible = value
//          await this.plugin.saveSettings()
//        }
//      )
//
//      addColorPickerFollowedByResetButton(groupSetting, group.color ?? pluginSettings.fallbackColor, pluginSettings.fallbackColor,
//        async (value?: string) => {
//          group.color = value
//          await this.plugin.saveSettings()
//        }
//      )
//
//      addVerticalMovementButtonsForPriority(groupSetting, isLowestPriority, isHighestPriority,
//        async () => {
//          const groupSettings = Object.values(groups).filter(x => x.priority === currPriority + 1)
//
//          if (groupSettings?.length === 1 && Priorities.switchValues(group, groupSettings[0]!)) {
//            await saveSettingsAndReRenderGroupSettings()
//          } else {
//            new Notice(`Warn: can not find matching entry with priority '${currPriority + 1}'`)
//          }
//        },
//        async () => {
//          const groupSettings = Object.values(groups).filter(x => x.priority === currPriority - 1)
//
//          if (groupSettings?.length === 1 && Priorities.switchValues(group, groupSettings[0]!)) {
//            await saveSettingsAndReRenderGroupSettings()
//          } else {
//            new Notice(`Warn: can not find matching entry with priority '${currPriority - 1}'`)
//          }
//        })
//
//      addDeleteButton(groupSetting, true, '', async () => {
//          delete pluginSettings.groups[id]
//          await saveSettingsAndReRenderGroupSettings()
//        }
//      )
//
//    } /* end of calendar loop  */
//
//    addCreateSetting(new Setting(mainGroupContainer), 'group', async (groupName: string) => {
//        if (!groups[groupName]) {
//          groups[groupName] = {
//            visible: true,
//            color: pluginSettings.fallbackColor,
//            priority: priorities.max + 1
//          }
//          await saveSettingsAndReRenderGroupSettings()
//        }
//      }
//    )
//
//  }

  /*
   * https://docs.obsidian.md/Plugins/User+interface/Settings
   *
   * https://docs.obsidian.md/plugins/guides/migrate-declarative-settings
   */
  getSettingDefinitions() {

    const openAddForm = (target: "groups" | "calendars") => {
      new AddEntryModal(this.plugin, (entry) => {
        const list = this.plugin.settings[target]

        // Set priority to the end of the current list
        const newEntry = {...entry, priority: list.length}

        list.push(newEntry)

        void this.plugin.saveData(this.plugin.settings).then(() => {
//          this.getSettingDefinitions()
          this.update()
        })
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
              placeholder: DEFAULT_SETTINGS.fallbackColor,
            }
          }
        ]
      },
      /* Calendar list */
      {
        type: 'list',
        heading: 'Calendars',
        emptyState: 'No calendar defined yet.',
        addItem: {
          name: 'Add group',
          action: () => this.emptyMethod(),
        },
        items: []
      },
      /* Group list */
      {
        type: 'list',
        heading: 'Groups',
        emptyState: 'No group defined yet.',
        addItem: {
          name: 'Add group',
          action: () => openAddForm('groups')
        },
        onReorder: async (oldIndex: number, newIndex: number) => {
          let [moved] = this.plugin.settings.groups.splice(oldIndex, 1)
          if (moved) {
            this.plugin.settings.groups.splice(newIndex, 0, moved)
            this.plugin.settings.groups.forEach((group, index) => {
              group.priority = index
            })
            await this.plugin.saveSettings()
//            this.update()
          }
        },
        onDelete: async (idx: number) => {
          this.plugin.settings.groups.splice(idx, 1)
          await this.plugin.saveSettings()
//          this.update()
        },
        items: this.plugin.settings.groups.map((group) => ({
          name: group.id,
          searchable: false,
          render: (setting: Setting) => {
            setting
            .addButton(btn => btn.setIcon(group.visible ? VISIBLE_ICON : INVISIBLE_ICON).setTooltip('Click to toggle visibility', {delay: -1})
              .onClick(async () => {
                group.visible = !group.visible
                void btn.setIcon(group.visible ? VISIBLE_ICON : INVISIBLE_ICON)
                await this.plugin.saveSettings()
              })
            )
            .addColorPicker(cc => cc
              .setValue(group.color ?? this.plugin.settings.fallbackColor)
              .onChange(async (value) => {
                  group.color = value
                  await this.plugin.saveSettings()
                }
              )
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

  private emptyMethod() {
    /*
    TODO
     */
  }

}
