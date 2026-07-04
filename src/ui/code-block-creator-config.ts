import RubikCubeAlgos from '../main'
import {App, Modal} from 'obsidian'
import {FantasyGanttSettings} from "../settings";
import {GenericModalInput, OptionalInput, OutputData} from "../code-block-creator/code-block-creator-types";
import {GenericModal} from "../code-block-creator/code-block-creator-modal";

// npm update @Altarok/obsidian-dev-utils
export class CodeBlockCreatorModal extends Modal {
  constructor(public readonly app: App, public readonly plugin: RubikCubeAlgos) {
    super(app)
  }

  onOpen() {
    const {contentEl} = this
    contentEl.empty()

    const output: Record<string, OutputData> = {}

    // const mandatoryInput: Readonly<MandatoryInput>[] = createMandatoryInput()
    const optionalInput: Readonly<OptionalInput>[] = defineInput(this.plugin.settings)

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

    const input: GenericModalInput = {
      pluginName: 'Gantt This',
      codeBlockId: 'fantasy-gantt',
      input: optionalInput,
      onUpdatePreview,
      output
    }

    new GenericModal(contentEl, input).display()

    contentEl.focus()
  }

  onClose() {
    this.contentEl.empty()
  }
}


function defineInput(_pluginSettings: FantasyGanttSettings): OptionalInput[] {

  return [
    {
      type: 'path', prompt: 'Where to read timeline events from.',
      key: 'eventPath',
      mandatory: false
    },
    {
      type: 'boolean', prompt: 'Search subfolders?',
      key: 'eventPathRecursive',
      mandatory: false, current: 'true
    },
    {
      type: 'expandable', prompt: 'Colors', mandatory: false,
      nestedInput: []
    },
    {
      type: 'expandable', prompt: 'Advanced', mandatory: false,
      nestedInput: []
    },
  ]
}
