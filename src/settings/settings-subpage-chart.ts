import {SettingDefinitionItem} from 'obsidian'
import {ControlKeyMapped, PluginSettings} from '../const/types'
import {DEFAULT_SETTINGS} from '../const/default-values'

export function createAdvancedUxSettingDefinition(settings: PluginSettings): SettingDefinitionItem {

  const items: SettingDefinitionItem[] = [

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
            validate: value => (value !== settings.uxPanButton) ? undefined : 'Must differ from pan key.',
            defaultValue: DEFAULT_SETTINGS.uxZoomButton
          }
        },
        {
          name: 'Pan key',
          desc: 'Key to hold while scrolling to pan horizontally.',
          control: {
            type: 'dropdown', key: 'uxPanButton', options: ControlKeyMapped,
            validate: value => (value !== settings.uxZoomButton) ? undefined : 'Must differ from zoom key.',
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
     * TO-DO #hide-setting-groups
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
