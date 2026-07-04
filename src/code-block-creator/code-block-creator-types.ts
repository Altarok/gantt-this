import {SliderComponent, ToggleComponent, ValueComponent} from 'obsidian'
import {GenericModal} from './code-block-creator-modal'

export type OutputData = string | boolean | number | undefined

export type Input = {
  type: 'boolean' | 'color' | 'conditional' | 'dropdown' | 'dropdownMulti' | 'slider' | 'string' | 'expandable'
  prompt: string
  mandatory?: boolean
}
export type BaseInput = Input & {
  key: string; ignoreKeyInCodeBlock?: boolean; tooltip?: string; current?: OutputData
}
export type BooleanInput = BaseInput & {
  type: 'boolean'; current: boolean
}
export type ColorInput = BaseInput & {
  type: 'color'; current: string
}
export type ConditionalInput = BaseInput & {
  type: 'conditional'; subPrompt: string
  nestedInput: { key: string, dropdownOptions: string[] | Record<string, string> }[]
}
export type DropdownInput = BaseInput & {
  type: 'dropdown'; current: string; dropdownOptions: readonly string[]
}
export type DropdownMultiInput = BaseInput & {
  type: 'dropdownMulti';
  current: string;
  resetOnCurrent: boolean;
  dropdownOptions: readonly string[] | Record<string, string>
}
export type SliderInput = BaseInput & {
  type: 'slider'; current: number; from: number; to: number; step: number
}
export type StringInput = BaseInput & {
  type: 'string'; current: string; validationPattern?: RegExp
}
export type ExpandableInput = Input & {
  type: 'expandable'; mandatory: false; nestedInput: readonly MandatoryInput[]
}

export type NonExpandableInput =
  BooleanInput
  | ColorInput
  | DropdownInput
  | DropdownMultiInput
  | SliderInput
  | StringInput
  | ConditionalInput

export type MandatoryInput = Readonly<NonExpandableInput>
export type OptionalInput = Readonly<NonExpandableInput | ExpandableInput>

export type GenericModalInput = {
  readonly pluginName: string
  readonly codeBlockId: string
  readonly keyValueSeparator?: string
  // readonly mandatory: readonly MandatoryInput[]
  // readonly optional: readonly OptionalInput[]
  readonly input: readonly OptionalInput[]
  readonly onUpdatePreview?: (previewEl: HTMLDivElement) => void

  output: Record<string, OutputData>
}

export type SelectorContext = {
  contentEl: HTMLElement
  input: NonExpandableInput
  output: Record<string, OutputData>
  callback: GenericModal
  isOptional: boolean
}

export type ComponentTypeForReset<T> =
  T extends BooleanInput ? ToggleComponent :
    T extends SliderInput ? SliderComponent :
      ValueComponent<string>
