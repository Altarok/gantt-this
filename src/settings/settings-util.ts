import {Modal, Notice, Setting} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {GroupOrCalendarSettings} from '../const/types'

const ID_REGEX = /^[\w -]+$/
const DESCRIPTION = `Must be unique. Allowed: letters, numbers, spaces, '-' and '_'.`
const DESCRIPTION_DUPLICATE = 'This ID is already in use. Please choose another.'
const DESCRIPTION_INVALID = 'Invalid format! Use only letters, numbers, spaces, hyphens, and underscores.'

export class AddEntryModal extends Modal {
  private result: Partial<GroupOrCalendarSettings> = {}
  private existingIds: Set<string>

  constructor(readonly plugin: FantasyGanttPlugin,
              existingIds: string[],
              readonly onSubmit: (entry: GroupOrCalendarSettings) => void) {
    super(plugin.app)
    this.existingIds = new Set(existingIds)
  }

  onOpen() {
    const {contentEl} = this
    contentEl.empty()
    contentEl.createEl('h2', {text: 'Add new item'})

    let addButton: HTMLButtonElement

    const idSetting = new Setting(contentEl).setName('ID')
    .setDesc(DESCRIPTION)
    .addText(text => {
      text.onChange((value) => {
        const trimmed = value.trim()
        this.result.id = trimmed

        // Validation checks
        const isValidFormat = ID_REGEX.test(trimmed)
        const isUnique = !this.existingIds.has(trimmed)
        const isValid = trimmed.length > 0 && isValidFormat && isUnique

        // Toggle error UI feedback
        idSetting.descEl.toggleClass('is-error', !isValid && trimmed.length > 0)
        if (!isValidFormat && trimmed.length > 0) {
          idSetting.setDesc(DESCRIPTION_INVALID)
        } else if (!isUnique) {
          idSetting.setDesc(DESCRIPTION_DUPLICATE)
        } else {
          idSetting.setDesc(DESCRIPTION)
        }

        // Disable/Enable the submit button
        if (addButton) {
          addButton.disabled = !isValid
        }
      })
    })

    new Setting(contentEl).addButton(btn => {
      btn.setButtonText('Add')
      .setCta()
      .onClick(() => {
        if (!this.result.id || !ID_REGEX.test(this.result.id) || this.existingIds.has(this.result.id)) {
          new Notice('Please enter a valid, unique ID.')
          return
        }

        this.close()
        this.onSubmit(this.result as GroupOrCalendarSettings)
      })

      addButton = btn.buttonEl
      addButton.disabled = true // Initially disabled until user types a valid ID
    })

//    new Setting(contentEl).addButton(btn => btn
//      .setButtonText('Add')
//      .setCta()
//      .onClick(() => {
//        if (!this.result.id) return
//
//        this.close()
//        this.onSubmit(this.result as GroupOrCalendarSettings)
//      })
//    )
  }

  onClose() {
    const {contentEl} = this
    contentEl.empty()
  }
}


//const VISIBLE_ICON = 'eye' /* an open eye */
//const INVISIBLE_ICON = 'eye-off' /* an open eye, but with strike through */
//
//export function addVisibilityToggleButton(setting: Setting, initialVisibility: boolean, saveSettingsCallback: (value: boolean) => Promise<void>) {
//
//  let visible = initialVisibility
//
//  setting.addButton(btn => btn.setIcon(visible ? VISIBLE_ICON : INVISIBLE_ICON).setTooltip('Click to toggle visibility', {delay: -1})
//    .onClick(async () => {
//      visible = !visible
//      void btn.setIcon(visible ? VISIBLE_ICON : INVISIBLE_ICON)
//      await saveSettingsCallback(visible)
//    })
//  )
//
//}
//
//export function addColorPickerFollowedByResetButton(setting: Setting, color: string, fallbackColor: string, saveSettingsCallback: (value?: string) => Promise<void>) {
//
//  let clrPicker: ColorComponent
//
//  setting.addColorPicker(cc => clrPicker = cc.setValue(color)
//    .onChange(async (value) => await saveSettingsCallback(value))
//  )
//
//  setting.addButton(btn => btn.setIcon('rotate-ccw').setTooltip('Reset color', {delay: -1})
//    .onClick(async () => {
//      clrPicker.setValue(fallbackColor)
//      await saveSettingsCallback(undefined)
//    })
//  )
//
//}
//
//export function addVerticalMovementButtonsForPriority(setting: Setting, isLowestPriority: boolean, isHighestPriority: boolean,
//                                                      lowerPriorityCallback: () => Promise<void>, raisePriorityCallback: () => Promise<void>) {
//
//  setting.addButton(btn => btn.setIcon('chevron-down')
//    .setTooltip(isLowestPriority ? 'Can not lower further' : 'Lower priority by 1', {delay: -1})
//    .setDisabled(isLowestPriority)
//    .onClick(async () => lowerPriorityCallback())
//  )
//
//  setting.addButton(btn => btn.setIcon('chevron-up')
//    .setTooltip(isHighestPriority ? 'Can not raise further' : 'Raise priority by 1', {delay: -1})
//    .setDisabled(isHighestPriority)
//    .onClick(async () => raisePriorityCallback())
//  )
//
//}
//
//export function addDeleteButton(setting: Setting, isDeletable: boolean, nonDeletableEntryWarning: string, saveSettingsCallback: () => Promise<void>) {
//
//  setting.addButton(btn => btn.setIcon('trash-2').setWarning()
//    .setTooltip(isDeletable ? 'Delete' : nonDeletableEntryWarning, {delay: -1})
//    .setDisabled(!isDeletable)
//    .onClick(async () => await saveSettingsCallback())
//  )
//
//}
//
//export function addCreateSetting(setting: Setting, createWhat: string, saveSettingsCallback: (value: string) => Promise<void>) {
//
//  let currentInput = ''
//
//  setting.setName(`Add ${createWhat}`).setDesc('Default color will be assigned.')
//  .addText(text => text
//    .setPlaceholder('New name')
//    .onChange(val => currentInput = val.trim().toLowerCase())
//  )
//  .addExtraButton(eb => eb.setIcon('save')
//    .onClick(async () => {
//        if (currentInput) await saveSettingsCallback(currentInput)
//      }
//    )
//  )
//
//}

