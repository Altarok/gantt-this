import {App, DropdownComponent, ExtraButtonComponent, MarkdownView, Notice, Setting, SettingGroup} from 'obsidian'
import {
  BooleanInput,
  ColorInput,
  ComponentTypeForReset,
  ConditionalInput,
  DropdownInput,
  DropdownMultiInput,
  ExpandableInput,
  GenericModalInput,
  MandatoryInput,
  NonExpandableInput,
  OptionalInput,
  OutputData,
  SelectorContext,
  SliderInput,
  StringInput
} from './code-block-creator-types'


interface ObsidianWindow extends Window {
  app: App
}


function toRecord(strings: readonly string[] | Record<string, string>): Record<string, string> {
  if (Array.isArray(strings)) return Object.fromEntries(strings.map(s
:
  string => [s, s]
))
else
  return strings as Record<string, string>
}

const SelectorRegistry: Record<string, (ctx: SelectorContext) => Selector> = {
  boolean: ctx => new BooleanSelector(ctx),
  color: ctx => new ColorSelector(ctx),
  conditional: ctx => new ConditionalSelector(ctx),
  dropdown: ctx => new DropdownSelector(ctx),
  dropdownMulti: ctx => new DropdownMultiSelector(ctx),
  slider: ctx => new SliderSelector(ctx),
  string: ctx => new StringSelector(ctx)
}


abstract class Selector<T extends MandatoryInput = MandatoryInput> {
  readonly contentEl: HTMLElement
  readonly data: T
  readonly callback: GenericModal
  readonly isOptional: boolean
  output: Record<string, OutputData>
  resettableComponent?: ComponentTypeForReset<T>
  setting: Setting

  constructor(ctx: SelectorContext) {
    this.contentEl = ctx.contentEl
    this.data = ctx.input as T
    this.output = ctx.output
    this.callback = ctx.callback
    this.isOptional = ctx.isOptional
    this.setting = new Setting(this.contentEl)
  }

  private validate(value: string): boolean {
    if (this.data.type !== 'string' || !this.data.validationPattern) return true
    return this.data.validationPattern?.test(value) ?? true
  }

  write(value: OutputData) {
    if (typeof value === 'string' && !this.validate(value)) return
    this.output[this.data.key] = value
    this.callback.updateTextArea()
  }

  revert() {
    this.resetValueToCurrent() // set before(!) output
    this.output[this.data.key] = undefined // set output
    this.callback.updateTextArea()
  }

  addName() {
    this.setting.setName(this.data.prompt)
  }

  abstract draw(): void

  addResetButton() {
    this.addResetButton2(this.setting)
  }

  addResetButton2(setting: Setting) {
    if (!this.isOptional) return
    const backupValue: string = typeof this.data.current === 'boolean' || this.data.current ? `${this.data.current}` : 'none'
    let tooltip: string = `Reset to: ${backupValue}`
    setting.addExtraButton(eb =>
      eb.setIcon('lucide-rotate-ccw')
        .setTooltip(tooltip, {delay: -1})
        .onClick(() => this.revert()))
  }

  resetValueToCurrent(): void {
    if (!this.resettableComponent) return
    if (this.data.type === 'dropdownMulti') {
      // nothing to do, class overwrites method
    } else {
      this.resettableComponent.setValue(this.data.current as never)
    }
  }
}

class BooleanSelector extends Selector<BooleanInput> {
  draw() {
    const {setting, data} = this
    setting.clear()
    super.addName()

    setting.addToggle(tc => this.resettableComponent =
      tc.setValue(data.current).onChange((active: boolean) => {
        if (active === data.current) this.revert()
        else this.write(active)
      })
    )

    this.addResetButton()
  }
}

class ColorSelector extends Selector<ColorInput> {
  draw() {
    const {setting, data} = this
    setting.clear()
    super.addName()
    setting.addColorPicker(c => this.resettableComponent =
      c.setValue(data.current)
        .onChange(value => this.write(value)))
    this.addResetButton()
  }
}

type NestedInputItem = ConditionalInput['nestedInput'][number]

class ConditionalSelector extends Selector<ConditionalInput> {
  private outerDropdown!: DropdownComponent
  private innerDropdown!: DropdownComponent
  private outerDropdownOptions: string[] = []
  private innerDropdownOptions: Map<string, NestedInputItem> = new Map<string, NestedInputItem>()

  constructor(ctx: SelectorContext) {
    super(ctx)
    this.data.nestedInput.forEach(ni => {
      this.outerDropdownOptions.push(ni.key)
      this.innerDropdownOptions.set(ni.key, ni)
    })
    const subSetting = new Setting(this.contentEl).setName(this.data.subPrompt).addDropdown(dd => {
      this.innerDropdown = dd
      this.resettableComponent = dd
    })
    this.addResetButton2(subSetting)
  }

  draw() {
    const {setting} = this
    const initialSelection = this.outerDropdownOptions[0] ?? 'none'

    setting.clear()
    super.addName()
    setting.addDropdown(dd => this.outerDropdown =
      dd.addOptions(toRecord(this.outerDropdownOptions))
        .setValue(initialSelection))

    const setupInnerDropdownWithOuterSelection = (outerSelection: string): void => {

      const matchingOptions: string[] | Record<string, string> = this.innerDropdownOptions.get(outerSelection)?.dropdownOptions ?? []

      const currentSelection = (this.output[this.data.key] as string) || 'none'

      this.innerDropdown.addOptions(toRecord(matchingOptions))
        .setValue(currentSelection)
        .onChange(val => this.write(val))
    }

    setupInnerDropdownWithOuterSelection(initialSelection)

    this.outerDropdown.onChange(val => {
      this.innerDropdown.selectEl.empty()
      setupInnerDropdownWithOuterSelection(val)
    })

    this.addResetButton()
  }
}

class DropdownSelector extends Selector<DropdownInput> {
  draw() {
    const {setting, data} = this
    setting.clear()
    super.addName()
    setting.addDropdown(dd => this.resettableComponent =
      dd.addOptions(toRecord(data.dropdownOptions)).setValue(data.current)
        .onChange((value: string) => this.write(value))
    )
    this.addResetButton()
  }
}

class DropdownMultiSelector extends Selector<DropdownMultiInput> {
  private selections: string[] = []
  private separator: string = ',' // add data.separator to type?
  dropdownComponent?: DropdownComponent

  draw() {
    const {setting, data} = this
    setting.clear()
    super.addName()

    setting.addDropdown(button => this.dropdownComponent =
      button
        .addOptions(toRecord(data.dropdownOptions))
        .onChange((value: string) => {
          if (value === data.current) this.selections = []
          else this.selections.remove(data.current)
          if (!this.selections.includes(value)) this.selections.push(value)
          const concatenatedSelections: string = this.selections.join(this.separator)
          this.write(concatenatedSelections)
        })
    )

    this.addResetButton()
  }

  resetValueToCurrent(): void {
    this.resettableComponent?.setValue(this.data.current)
    this.dropdownComponent?.setValue(this.data.current)
    this.selections = []
  }
}

class ExpandableSelector {
  private toggleActive: boolean = false
  private hasBuilt: boolean = false
  private bc?: ExtraButtonComponent
  private wrapperEl!: HTMLDivElement

  constructor(public contentEl: HTMLElement,
              public data: ExpandableInput,
              public output: Record<string, OutputData>,
              public cb: GenericModal) {
  }

  hideOrShow(toggleActive: boolean) {
    if (toggleActive) this.show(); else this.hide()
  }

  hide() {
    this.toggleActive = false
    this.bc?.setIcon('lucide-chevron-down')
    this.wrapperEl.style.height = '0px'
  }

  private show() {
    this.toggleActive = true
    this.bc?.setIcon('lucide-chevron-up')
    this.cb.collapseOtherExpandableSelectors(this)

    this.wrapperEl.style.height = `${this.wrapperEl.scrollHeight}px`
    this.wrapperEl.style.backgroundColor = 'var(--background-modifier-box-shadow)'
    this.wrapperEl.style.borderRadius = '8px'
  }

  draw() {
    if (this.hasBuilt) {
      this.hideOrShow(this.toggleActive)
      return
    }

    const {data, output, contentEl, cb: callback} = this
    const settingGroup: SettingGroup = new SettingGroup(contentEl)

    settingGroup.setHeading(data.prompt)

    settingGroup.addExtraButton(bc =>
      this.bc = bc.setIcon('lucide-chevron-down').onClick(() => this.hideOrShow(!this.toggleActive))
    )

    // Create the outer grid container and inner content wrapper for CSS transitions
    this.wrapperEl = contentEl.createDiv()
    this.wrapperEl.style.overflow = 'hidden'
    this.wrapperEl.style.transition = 'height 0.25s ease-out'
    this.wrapperEl.style.marginBottom = '12px'

    const addInlineCssToSubSetting = (setting: Setting): void => {
      Object.assign(setting.settingEl.style, {
        display: 'flex',
        flexShrink: '0',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '6px 12px'
      })

      Object.assign(setting.controlEl.style, {
        display: 'flex',
        alignItems: 'center',
        flexShrink: '0'
      })
    }

    for (const input of data.nestedInput) {

      const render = SelectorRegistry[input.type]
      if (render) {
        const selector: Selector = render({contentEl: this.wrapperEl, input, output, callback, isOptional: true})
        selector.draw()
        addInlineCssToSubSetting(selector.setting)
      }

    }

    this.hideOrShow(this.toggleActive)
    this.hasBuilt = true
  }

}

class SliderSelector extends Selector<SliderInput> {
  draw() {
    const {setting, data} = this
    setting.clear()
    super.addName()

    let lowerBound: number = data.from
    let upperBound: number = data.to

    if (data.current < lowerBound) lowerBound = data.current
    else if (data.current > upperBound) upperBound = data.current

    setting.addSlider(sc => this.resettableComponent =
      sc.setValue(data.current).setLimits(lowerBound, upperBound, data.step)
        .onChange((value: number) => this.write(value))
    )

    super.addResetButton()
  }
}

class StringSelector extends Selector<StringInput> {
  draw() {
    const {setting, data} = this
    setting.clear()
    super.addName()

    setting.addText(tc => this.resettableComponent =
      tc.setValue(data.current).onChange((value: string) => this.write(value)))

    super.addResetButton()
  }
}

export class GenericModal {
  private textElement!: HTMLTextAreaElement
  private previewContainerEl!: HTMLDivElement
  private adjustHeight!: () => void
  private expandableSelectors: ExpandableSelector[] = []
  private isEditableMarkdownFile: boolean

  constructor(public contentEl: HTMLElement, public data: GenericModalInput) {
    const localApp = (window as unknown as ObsidianWindow).app
    this.isEditableMarkdownFile = localApp.workspace.activeEditor?.file?.extension == 'md'
      && localApp.workspace.getActiveViewOfType(MarkdownView)?.getState().mode === 'source'
  }

  private createSelectors(isOptional: boolean, inputs: readonly OptionalInput[]) {
    const {contentEl, data} = this
    const output = data.output


    for (const input of inputs) {

      if (input.type === 'expandable') {
        if (isOptional) {
          const expandableSelector = new ExpandableSelector(contentEl, input, output, this)
          expandableSelector.draw()
          this.expandableSelectors.push(expandableSelector)
        } else {
          new Notice('Mandatory input can not be expandable')
        }
        continue
      }

      const render = SelectorRegistry[input.type]
      if (render) {
        render({contentEl, input, output, callback: this, isOptional}).draw()
      }
    }
  }

  display() {
    const {contentEl, data} = this

    const headingText = data.pluginName ? `[${data.pluginName}] Code block creator` : 'Code block creator'
    new Setting(contentEl).setName(headingText).setHeading()

    this.createSelectors(false, data.input.filter(d => d.mandatory))
    this.createSelectors(true, data.input.filter(d => !d.mandatory))

    /* create live SVG */
    this.previewContainerEl = contentEl.createDiv()
    this.previewContainerEl.style.width = '100%'
    this.previewContainerEl.style.display = 'flex'
    this.previewContainerEl.style.justifyContent = 'center'
    this.previewContainerEl.style.marginBottom = '0'

    /* Create text area */
    this.createTextArea()
    this.updateTextArea()
  }

  private createTextArea() {

    const codeBlockContent: string = this.createCodeBlock()

    const setting = new Setting(this.contentEl).setName('Output')
      .addTextArea(cb => {
        cb.setValue(codeBlockContent).setDisabled(true)
        this.textElement = cb.inputEl
        cb.inputEl.style.width = '100%'
        cb.inputEl.style.height = '80px' // Set a generous default height for the code block
        cb.inputEl.style.resize = 'vertical' // Allow the user to manually scale it vertically if they want
      }).addExtraButton(bc => bc
        .setIcon('copy')
        .onClick(async () => this.copyToClipboard())
        .setTooltip('Copy code block to clipboard', {'delay': -1})
      ).addExtraButton(bc => bc
          .setIcon(this.isEditableMarkdownFile ? 'save' : 'save-off')
          .onClick(async () => this.saveToOpenFile())
          .setTooltip(this.isEditableMarkdownFile ? 'Save to note' : 'Can only save to editable Markdown note', {'delay': -1})
        // .setDisabled(!this.isEditableMarkdownFile)
      )


    this.adjustHeight = () => {
      this.textElement.style.height = 'auto'
      this.textElement.style.height = `${this.textElement.scrollHeight}px`
    }

    this.adjustHeight()

    setting.controlEl.style.width = '100%'
    setting.controlEl.style.flexGrow = '1'

    // Make live output move below its setting name
    setting.settingEl.style.flexDirection = 'column'
    setting.settingEl.style.alignItems = 'stretch'

    return setting
  }

  updateTextArea(): void {
    const codeBlockContent = this.createCodeBlock()

    if (this.textElement) {
      this.textElement.value = codeBlockContent
    }

    this.adjustHeight()

    /* Trigger live preview */
    if (this.data.onUpdatePreview && this.previewContainerEl) {
      this.data.onUpdatePreview(this.previewContainerEl)
    }
  }

  private async copyToClipboard() {
    const codeBlockContent = this.createCodeBlock()
    try {
      await window.navigator.clipboard.writeText(codeBlockContent)
      new Notice('Code block copied to clipboard.')
    } catch (error) {
      new Notice('Copy to clipboard failed. ' + error)
    }
  }

  private async saveToOpenFile() {
    if (!this.isEditableMarkdownFile) {
      new Notice('Can only save to editable Markdown note!')
      return
    }

    const codeBlockContent = this.createCodeBlock()

    const localApp = (window as unknown as ObsidianWindow).app
    const activeView = localApp.workspace.getActiveViewOfType(MarkdownView)

    if (activeView && activeView.editor) {
      activeView.editor.replaceSelection(`\n${codeBlockContent}\n`)
      new Notice('Saved code block to open file.')
    }
  }

  private flattenInput(inputs: readonly OptionalInput[]): NonExpandableInput[] {
    return inputs.flatMap(input => input.type === 'expandable' ? this.flattenInput(input.nestedInput) : [input])
  }

  private createCodeBlock = (): string => {
    const {codeBlockId, input, output} = this.data

    const allFlatSettings: NonExpandableInput[] = this.flattenInput(input)

    const allFlatSettingsOfInterest: NonExpandableInput[] = allFlatSettings.filter(m => output[m.key])

    const sortedFlatSettingsOfInterest: NonExpandableInput[] = allFlatSettingsOfInterest.sort((a, b) =>
      a.mandatory === b.mandatory ? 0 : a.mandatory ? 1 : -1)

    let codeBlockContent: string = sortedFlatSettingsOfInterest
      .filter(setting => { // keep only valid non-default values
        const localValue = output[setting.key]
        return localValue !== undefined && localValue !== '' && localValue !== setting.current
      })
      .map(setting => { // add key prefix if wanted
        const localValue = output[setting.key]
        return setting.ignoreKeyInCodeBlock ? `${localValue}` : `${setting.key}: ${localValue}`
      })
      .join('\n')

    if (codeBlockContent.length > 0) codeBlockContent += '\n'

    return `\`\`\`${codeBlockId}\n${codeBlockContent}\`\`\``
  }

  /** @param expandable - gets expanded right now */
  collapseOtherExpandableSelectors(expandable: ExpandableSelector) {
    this.expandableSelectors.forEach(e => {
      if (e !== expandable) e.hide()
    })
  }
}
