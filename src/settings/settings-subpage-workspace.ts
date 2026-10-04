import {SettingDefinitionItem} from 'obsidian'
import {DEFAULT_SETTINGS} from 'const/default-values'

export function createWorkspaceSettings(): SettingDefinitionItem {
  return {
    type: 'page',
    name: 'Workspace',
    desc: 'Extend your App options.',
    items: [
      {
        name: 'Add ribbon icon (desktop only)',
        desc: 'Adds a ribbon icon to quickly open a live chart preview.',
        control: {type: 'toggle', key: 'uxAddRibbonIcon', defaultValue: DEFAULT_SETTINGS.uxAddRibbonIcon}
      },
      {
        name: 'Add menu option (mobile ony)',
        desc: 'Adds a menu option to quickly open a live chart preview.',
        control: {
          type: 'toggle', key: 'uxAddRibbonIconMobile', defaultValue: DEFAULT_SETTINGS.uxAddRibbonIconMobile
        }
      },
      {
        name: 'Add plugin commands',
        desc: 'Adds commands to insert event properties, calendar definitions, and code blocks.',
        control: {type: 'toggle', key: 'uxAddCommands', defaultValue: DEFAULT_SETTINGS.uxAddCommands}
      }
    ]
  }
}
