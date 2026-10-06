import {SettingDefinitionItem} from 'obsidian'
import {GanttItemDisplayTypes, PluginSettings} from '../const/types'
import {DEFAULT_SETTINGS} from '../const/default-values'
import {SettingsUtil} from './settings-util'

export function createEventSettings(settings: PluginSettings): SettingDefinitionItem {
  return {
    type: 'page',
    name: 'Event Visuals',
    desc: 'Define how events and their tooltip renders.',
    items: [
      {
        heading: 'Events',
        type: 'group',
        desc: 'Select some default values',
        items: [
          {
            name: 'Symbol',
            desc: `Default symbol for timestamp events. Override with property: '${settings.frontMatterProperty_event_symbol}'`,
            control: {
              type: 'dropdown', key: 'uxDefaultTimestampEventSymbol',
              options: SettingsUtil.toRecord(GanttItemDisplayTypes.GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESTAMP),
              defaultValue: DEFAULT_SETTINGS.uxDefaultTimestampEventSymbol
            }
          },
          {
            name: 'Calendar',
            desc: `Default calendar for events. Override with property: '${settings.frontMatterProperty_event_calendar}'`,
            control: {
              type: 'dropdown', key: 'defaultCalendar',
              options: SettingsUtil.toRecord(settings.calendars.map(c => c.id)),
              defaultValue: DEFAULT_SETTINGS.defaultCalendar
            }
          },
          {
            name: 'Group',
            desc: `Default group for events. Override with property: '${settings.frontMatterProperty_event_group}'`,
            control: {
              type: 'dropdown', key: 'defaultGroup',
              options: SettingsUtil.toRecord(settings.groups.map(g => g.id)),
              defaultValue: DEFAULT_SETTINGS.defaultGroup
            }
          },
          {
            name: 'Shape Color',
            desc: `Default color for events. Used when not given in property: '${settings.frontMatterProperty_event_color}'`,
            control: {type: 'color', key: 'fallbackColor', defaultValue: DEFAULT_SETTINGS.fallbackColor}
          },
          {
            name: 'Icon Color',
            desc: `Default color for event icons. Used when not given in property: '${settings.frontMatterProperty_event_icon_color}'`,
            control: {type: 'color', key: 'fallbackColorForIcons', defaultValue: DEFAULT_SETTINGS.fallbackColorForIcons}
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
        heading: 'Pixel magic',
        type: 'group',
        desc: 'Change elemental sizes to match your screen.',
        items: [
          {
            name: 'Vertical line width',
            desc: `Set the line stroke width (in pixels) for 'vertical-line' events.`,
            control: {
              type: 'slider', key: 'uxVerticalLineEventWidth',
              min: 1, max: 10, step: 1, defaultValue: DEFAULT_SETTINGS.uxVerticalLineEventWidth
            }
          },
          {
            name: 'Event row height',
            desc: 'Height of a default event row.',
            control: {
              type: 'slider', key: 'viewEventRowHeight',
              min: 16, max: 40, step: 2,
              defaultValue: DEFAULT_SETTINGS.viewEventRowHeight
            }
          },
          {
            name: 'Event shape size',
            desc: 'Width and height of event shapes.',
            control: {
              type: 'slider', key: 'viewEventShapeHeight',
              min: 10, max: 30, step: 2,
              defaultValue: DEFAULT_SETTINGS.viewEventShapeHeight
            }
          },
          {
            name: 'Event icon size',
            desc: 'Width and height of event icons.',
            control: {
              type: 'slider', key: 'viewEventIconHeight',
              min: 10, max: 30, step: 2,
              defaultValue: DEFAULT_SETTINGS.viewEventIconHeight
            }
          }
        ]
      },
      {
        heading: 'Event Overlay / Tooltip',
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
            desc: `If activated, the frontmatter properties '${settings.frontMatterProperty_event_predecessors}'
             and '${settings.frontMatterProperty_event_successors}' will get checked against the names of other Gantt event notes.
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
              disabled: () => !settings.uxHighlightRelatedEvents
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
    ]
  }
}
