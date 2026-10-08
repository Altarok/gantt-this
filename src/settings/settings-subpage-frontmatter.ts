import {SettingDefinition, SettingDefinitionItem} from 'obsidian'
import {DEFAULT_SETTINGS} from '../const/default-values'
import {PluginSettings} from '../const/types'

/**
 * Creates setting definitions for configuring frontmatter property keys.
 * @param settings - Current plugin settings
 * @returns Setting definition item representing either a sub-page or a settings group
 */
export function createFrontMatterSettingDefinitions(settings: PluginSettings): SettingDefinitionItem {

  const items: SettingDefinition[] = [
    {
      name: 'Gantt event marker',
      desc: 'Primary frontmatter property used to identify Gantt events. Can be disabled using the toggle below.',
      control: {
        type: 'text',
        key: 'frontMatterProperty_gantt_this',
        placeholder: DEFAULT_SETTINGS.frontMatterProperty_gantt_this,
        defaultValue: DEFAULT_SETTINGS.frontMatterProperty_gantt_this,
        disabled: () => settings.frontMatterProperty_gantt_this_optional,
        validate: testFrontMatterInput
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
        validate: testFrontMatterInput
      },
    },
    {
      name: 'Event calendar',
      desc: 'Optional. Defines which calendar to apply this event to.',
      control: {
        type: 'text', key: 'frontMatterProperty_event_calendar',
        placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_calendar,
        defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_calendar,
        validate: testFrontMatterInput
      },
    },
    {
      name: 'Event name',
      desc: 'Optional. Name of the event.',
      control: {
        type: 'text', key: 'frontMatterProperty_event_name',
        placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_name,
        defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_name,
        validate: testFrontMatterInput
      },
    },
    {
      name: 'Event start date',
      desc: 'Mandatory property defining event start dates.',
      control: {
        type: 'text', key: 'frontMatterProperty_event_time_start',
        placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_time_start,
        defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_time_start,
        validate: testFrontMatterInput
      },
    },
    {
      name: 'Event end date',
      desc: 'Optional property defining event end dates.',
      control: {
        type: 'text', key: 'frontMatterProperty_event_time_end',
        placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_time_end,
        defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_time_end,
        validate: testFrontMatterInput
      },
    },
    {
      name: 'Event color',
      desc: 'Optional. Hex color or human-readable name.',
      control: {
        type: 'text', key: 'frontMatterProperty_event_color',
        placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_color,
        defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_color,
        validate: testFrontMatterInput
      },
    },
    {
      name: 'Event group',
      desc: 'Optional. Used to sort, group, and color events.',
      control: {
        type: 'text', key: 'frontMatterProperty_event_group',
        placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_group,
        defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_group,
        validate: testFrontMatterInput
      },
    },
    {
      name: 'Event symbol',
      desc: 'Optional property overriding the event symbol.',
      control: {
        type: 'text', key: 'frontMatterProperty_event_symbol',
        placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_symbol,
        defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_symbol,
        validate: testFrontMatterInput
      },
    },
    {
      name: 'Event icon name',
      desc: 'Optional. Name of the SVG icon (see https://lucide.dev for free examples).',
      control: {
        type: 'text', key: 'frontMatterProperty_event_icon_name',
        placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_icon_name,
        defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_icon_name,
        validate: testFrontMatterInput
      },
    },
    {
      name: 'Event icon color',
      desc: 'Optional. Hex color or human-readable name.',
      control: {
        type: 'text', key: 'frontMatterProperty_event_icon_color',
        placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_icon_color,
        defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_icon_color,
        validate: testFrontMatterInput
      }
    },
    {
      name: 'Target Header',
      desc: 'Optional property. Clicking an event scrolls to this specific header within the note.',
      control: {
        type: 'text', key: 'frontMatterProperty_note_header',
        placeholder: DEFAULT_SETTINGS.frontMatterProperty_note_header,
        defaultValue: DEFAULT_SETTINGS.frontMatterProperty_note_header,
        validate: testFrontMatterInput
      }
    },
    {
      name: 'Event predecessors',
      desc: 'Optional property (list). Predecessors will be highlighted on chart.',
      control: {
        type: 'text', key: 'frontMatterProperty_event_predecessors',
        placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_predecessors,
        defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_predecessors,
        validate: testFrontMatterInput
      }
    },
    {
      name: 'Event successors',
      desc: 'Optional property (list). Successors will be highlighted on chart.',
      control: {
        type: 'text', key: 'frontMatterProperty_event_successors',
        placeholder: DEFAULT_SETTINGS.frontMatterProperty_event_successors,
        defaultValue: DEFAULT_SETTINGS.frontMatterProperty_event_successors,
        validate: testFrontMatterInput
      }
    },

    /*
     * TO-DO #hide-setting-groups
     */
    // {
    // name: 'Hide this group', desc: HIDEABLE_GROUP_DESCRIPTION,
    // control: { type: 'toggle', key: 'hideSettingsPageFrontmatterProperties', defaultValue: DEFAULT_SETTINGS.hideSettingsPageFrontmatterProperties  }
    // }
  ]

  if (settings.hideSettingsPageFrontmatterProperties)
    return {
      type: 'page',
      name: 'Frontmatter properties',
      desc: 'Rename frontmatter properties used by the plugin.',
      items: items
    }
  else
    return {
      type: 'group',
      heading: 'Frontmatter properties',
      items: items
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
