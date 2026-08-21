import {Modal, Notice, Setting} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {GroupOrCalendarSettings} from '../const/types'

const ID_REGEX = /^[\w -]+$/
const DESCRIPTION = `Must be unique. Allowed: letters, numbers, spaces, '-' and '_'.`
const DESCRIPTION_DUPLICATE = 'This ID is already in use. Please choose another.'
const DESCRIPTION_INVALID = 'Invalid format! Use only letters, numbers, spaces, hyphens, and underscores.'

function getRandomHexColor(): string {
  return `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`
}

export class AddEntryModal extends Modal {

  private existingIds: Set<string>

  constructor(readonly plugin: FantasyGanttPlugin,
              existingIds: string[],
              readonly onSubmit: (entry: GroupOrCalendarSettings) => void) {
    super(plugin.app)
    this.existingIds = new Set(existingIds)
  }

  onOpen() {
    const result: Partial<GroupOrCalendarSettings> = {visible: true, color: getRandomHexColor()}

    const {contentEl} = this
    contentEl.empty()
    contentEl.createEl('h2', {text: 'Add new item'})
    contentEl.createDiv({text: 'IDs are case-sensitive.', attr: {'margin': 10}})

    let addButton: HTMLButtonElement

    const idSetting = new Setting(contentEl).setName('ID')
    .setDesc(DESCRIPTION)
    .addText(text => {
      text.onChange((value) => {
        const trimmed = value.trim()
        result.id = trimmed

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

    new Setting(contentEl).setDesc('Choose a color').addColorPicker(c => c.setValue(result.color!).onChange(v => result.color = v))

    new Setting(contentEl).addButton(btn => {
      btn.setButtonText('Add')
      .setCta()
      .onClick(() => {
        if (!result.id || !ID_REGEX.test(result.id) || this.existingIds.has(result.id)) {
          new Notice('Please enter a valid, unique ID.')
          return
        }

        this.close()
        this.onSubmit(result as GroupOrCalendarSettings)
      })

      addButton = btn.buttonEl
      addButton.disabled = true // Initially disabled until user types a valid ID
    })

  }

  onClose() {
    const {contentEl} = this
    contentEl.empty()
  }
}
