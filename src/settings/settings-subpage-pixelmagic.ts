import {SettingDefinitionItem} from 'obsidian'
import {DEFAULT_SETTINGS} from 'const/default-values'

export function createPixelMagicSettings(): SettingDefinitionItem {

  return {
    type: 'page',
    name: 'Pixel magic',
    desc: 'Change elemental sizes to match your screen.',
    items: [
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
  }
}
