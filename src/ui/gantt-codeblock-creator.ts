import {App, Modal} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {PluginSettings, PluginSettingsAlreadyUsedInCode} from '../types'
import {GenericModal, GenericModalInput, OutputData, UserInput} from '@Altarok/utils'
import {CodeBlock} from '../const/strings'
import {GanttRender} from './svg-drawer-prestep'

// npm update @Altarok/obsidian-dev-utils
// npm link @Altarok/obsidian-dev-utils
export class CodeBlockCreatorModal extends Modal {
  constructor(public readonly app: App, public readonly plugin: FantasyGanttPlugin) {
    super(app)
  }

  onOpen() {
    const {contentEl} = this
    contentEl.empty()

    const output: Record<string, OutputData> = {}

    // const globalSettings: Readonly<PluginSettings> = Object.assign({}, this.plugin.settings)
    const input: Readonly<UserInput>[] = defineInput(this.plugin.settings)

    const onUpdatePreview = (previewEl: HTMLElement): void => {
      previewEl.empty()

      const globalSettings: Readonly<PluginSettings> = this.plugin.settings
      const codeBlockContent: PluginSettingsAlreadyUsedInCode = mergeSettings(globalSettings, output)

      const render = new GanttRender(this.plugin)

      void render.renderGantt(previewEl, codeBlockContent)

    }

    const modalInput: GenericModalInput = {
      pluginName: 'Gantt This',
      codeBlockId: CodeBlock.id,
      input,
      onUpdatePreview,
      output
    }

    new GenericModal(contentEl, modalInput).display()

    contentEl.focus()
  }


  onClose() {
    this.contentEl.empty()
  }
}

/**
 * @param globalSettings - global plugin settings
 * @param localSettings - subset of plugin settings user chose to overwrite with code block creator
 */
function mergeSettings(globalSettings: Readonly<PluginSettings>, localSettings: Record<string, string | boolean | number | undefined>) {

  const mergedSettings: PluginSettingsAlreadyUsedInCode = Object.assign({}, globalSettings)

  const setSettingProperty = <K extends keyof PluginSettingsAlreadyUsedInCode>(key: K, val: PluginSettingsAlreadyUsedInCode[K]) => {
    /* AI written helper method for type compliance */
    mergedSettings[key] = val
  }

  for (const key of Object.keys(globalSettings) as (keyof PluginSettingsAlreadyUsedInCode)[]) {
    const localValue = localSettings[key]
    if (localValue === undefined) continue

    const globalValue = globalSettings[key]

    if (globalValue !== localValue && typeof globalValue === typeof localValue) {
      setSettingProperty(key, localValue)
    }
  }

  return mergedSettings
}

function defineInput(pluginSettings: PluginSettings): UserInput[] {
  return [
    {
      type: 'expandable', prompt: 'Data sources', mandatory: false,
      openOnStart: true,
      nestedInput: [
        {
          type: 'path', prompt: 'Folder to search for timeline events.',
          key: 'eventPath',  mandatory: true,
          current: pluginSettings.eventPath
        },
        {
          type: 'boolean', prompt: 'Search subfolders?',
          key: 'eventPathRecursive',
          current: pluginSettings.eventPathSearchRecursive
        },
        {
          type: 'path', prompt: 'Folder to search for calendar definitions.',
          key: 'calendarPath',
          current: pluginSettings.calendarPath
        },
        {
          type: 'boolean', prompt: 'Search subfolders?',
          key: 'calendarPathSearchRecursive',
          current: pluginSettings.calendarPathSearchRecursive
        }
      ]
    },
    {
      type: 'color', prompt: 'Ne Farbe.',
      key: 'neFarbe2',
      current: '#000000'
    },
    {
      type: 'expandable', prompt: 'Advanced', mandatory: false,
      openOnStart: false,
      nestedInput: [
        {
          type: 'color', prompt: 'Ne Farbe.',
          key: 'neFarbe',
          current: '#000000'
        },
        {
          type: 'slider', prompt: 'Ne Zahl zwischen 1 und 7',
          key: 'neZahl',
          from: 1, to: 7, current: 3, step: 1
        }
      ]
    },
    {
      type: 'slider', prompt: 'Ne Zahl zwischen 10 und 70', mandatory: true,
      key: 'neZahl2',
      from: 10, to: 70, current: 30, step: 5
    }
  ]
}
