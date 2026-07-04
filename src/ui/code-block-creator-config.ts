import RubikCubeAlgos from '../main'
import {App, Modal} from 'obsidian'
import {GenericModal, OptionalInput, OutputData} from '@Altarok/obsidian-dev-utils/src'
import {FantasyGanttSettings} from "../settings";
import {GenericModalInput} from "../code-block-creator/code-block-creator-types";

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
    const optionalInput: Readonly<OptionalInput>[] = createOptionalInput(this.plugin.settings)

    const onUpdatePreview = (_previewEl: HTMLElement): void => {
      // previewEl.empty()
      // if (!output.id) {
      //   previewEl.createDiv({ text: 'Please select algorithm.' })
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
      pluginName: `Rubik's Cube algorithms`,
      codeBlockId: 'rubikCube',
      // mandatory: mandatoryInput,
      optional: optionalInput,
      output,
      onUpdatePreview
    }

    new GenericModal(contentEl, input).display()

    contentEl.focus()
  }

  onClose() {
    this.contentEl.empty()
  }
}


function createOptionalInput(pluginSettings: FantasyGanttSettings): Readonly<OptionalInput>[] {

  return [
    {
      type: 'expandable', prompt: 'Colors',
      nestedInput: []
    },
    {
      type: 'expandable', prompt: 'Advanced',
      nestedInput: []
    },
  ]
}
