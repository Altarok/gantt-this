import {Modal, Notice, Setting} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {GroupOrCalendarSettings} from '../const/types'
import {getRandomHexColor} from './settings-util'

const ID_REGEX = /^[\w -]+$/
const DESCRIPTION = `Must be unique. Allowed: letters, numbers, spaces, '-' and '_'.`
const DESCRIPTION_DUPLICATE = 'This ID is already in use. Please choose another.'
const DESCRIPTION_INVALID = 'Invalid format! Use only letters, numbers, spaces, hyphens, and underscores.'


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
    contentEl.createDiv({text: 'IDs are case-sensitive.'})

    let addButton: HTMLButtonElement

    const idSetting = new Setting(contentEl).setName('ID')
    .setDesc(DESCRIPTION)
    .addText(text => {
      text.onChange(value => {
        result.id = value.trim()

        // Validation checks
        const isValidFormat = ID_REGEX.test(result.id)
        const isUnique = !this.existingIds.has(result.id)
        const isValid = result.id.length > 0 && isValidFormat && isUnique

        // Toggle error UI feedback
        idSetting.descEl.toggleClass('is-error', !isValid && result.id.length > 0)
        if (!isValidFormat && result.id.length > 0) {
          void idSetting.setDesc(DESCRIPTION_INVALID)
        } else if (!isUnique) {
          void idSetting.setDesc(DESCRIPTION_DUPLICATE)
        } else {
          void idSetting.setDesc(DESCRIPTION)
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
        // !ID_REGEX.test(result.id) || this.existingIds.has(result.id)
        if (!result.id || addButton.disabled) {
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

  /*
   * Delete when clean that Obsidian does that for me
   * https://docs.obsidian.md/Plugins/User+interface/Modals
   */
  onClose() {
    const {contentEl} = this
    contentEl.empty()
  }
}
