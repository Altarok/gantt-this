import {App, Modal} from 'obsidian'
import {FantasyGanttSettings} from '../settings'
import {GenericModal,GenericModalInput, OptionalInput, OutputData} from '@Altarok/obsidian-dev-utils'
import FantasyGanttPlugin from "../main";

// npm update @Altarok/obsidian-dev-utils
// npm link @Altarok/obsidian-dev-utils
export class CodeBlockCreatorModal extends Modal {
  constructor(public readonly app: App, public readonly plugin: FantasyGanttPlugin) {
    super(app)
  }

  onOpen() {
    const {contentEl} = this
    contentEl.empty()


    const input: Readonly<OptionalInput>[] = defineInput(this.plugin.settings)
    const output: Record<string, OutputData> = {}

    const onUpdatePreview = (_previewEl: HTMLElement): void => {
      // previewEl.empty()
      // if (!output.id) {
      //   previewEl.createDiv({ text: 'Please select algorithm.'})
      //   return
      // }
      //
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


function defineInput(_pluginSettings: FantasyGanttSettings): OptionalInput[] {

  return [
    {
      type: 'path', prompt: 'Folder to search for timeline events.',
      key: 'eventPath',
      mandatory: true
    },
    {
      type: 'boolean', prompt: 'Search subfolders?',
      key: 'eventPathRecursive',
      mandatory: false, current: true
    },
    // {
    //   type: 'expandable', prompt: 'Colors', mandatory: false,
    //   nestedInput: []
    // },
    // {
    //   type: 'expandable', prompt: 'Advanced', mandatory: false,
    //   nestedInput: []
    // },
  ]
}
