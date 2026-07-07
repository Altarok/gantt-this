import {App, Modal} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {FantasyGanttSettings} from '../settings'
import {GenericModal, GenericModalInput, OutputData, UserInput} from '@Altarok/utils'

// npm update @Altarok/obsidian-dev-utils
// npm link @Altarok/obsidian-dev-utils
export class CodeBlockCreatorModal extends Modal {
  constructor(public readonly app: App, public readonly plugin: FantasyGanttPlugin) {
    super(app)
  }

  onOpen() {
    const {contentEl} = this
    contentEl.empty()


    const input: Readonly<UserInput>[] = defineInput(this.plugin.settings)
    const output: Record<string, OutputData> = {}

    const onUpdatePreview = (previewEl: HTMLElement): void => {
      previewEl.empty()

      // let pseudoCodeBlockContent = ''
      //
      // const allFlatInputs = optionalInput.flatMap(i => i.type === 'expandable' ? i.nestedInput : [i])
      //
      // for (const key in output) {
      //   if (Object.prototype.hasOwnProperty.call(output, key)) {
      //     const value = output[key]
      //
      //     // Guard against undefined values to satisfy noUncheckedIndexedAccess
      //     if (value !== undefined && value !== null) {
      //       const matchingInputDefinition = allFlatInputs.find(input => input.key === key)
      //       const ignoreKey = matchingInputDefinition?.ignoreKeyInCodeBlock === true
      //
      //       if (ignoreKey) {
      //         pseudoCodeBlockContent += `${String(value)}\n`
      //       } else {
      //         pseudoCodeBlockContent += `${key}: ${String(value)}\n`
      //       }
      //     }
      //   }
      // }
      //
      // new GenericMarkdownProcessor(pseudoCodeBlockContent, this.plugin, previewEl).display() // IgnoringErrors(true)
    }

    const modalInput: GenericModalInput = {
      pluginName: 'Gantt This',
      codeBlockId: 'fantasy-gantt',
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

function defineInput(pluginSettings: FantasyGanttSettings): UserInput[] {


  return [
    {
      type: 'expandable', prompt: 'Data sources', mandatory: false,
      openOnStart: true,
      nestedInput: [
        {
          type: 'path', prompt: 'Folder to search for timeline events.',
          key: 'eventPath',
          current: pluginSettings.eventPath
        }, {
          type: 'boolean', prompt: 'Search subfolders?',
          key: 'eventPathRecursive',
          current: pluginSettings.eventPathSearchRecursive
        }, {
          type: 'path', prompt: 'Folder to search for calendar definitions.',
          key: 'calendarPath',
          current: pluginSettings.calendarPath
        }, {
          type: 'boolean', prompt: 'Search subfolders?',
          key: 'calendarPathSearchRecursive',
          current: pluginSettings.calendarPathSearchRecursive
        }
      ]
    }, {
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
    }, {
      type: 'slider', prompt: 'Ne Zahl zwischen 10 und 70', mandatory: true,
      key: 'neZahl2',
      from: 10, to: 70, current: 30, step: 5
    }
  ]
}
