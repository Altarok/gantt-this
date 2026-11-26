import {Modal, Notice, Setting} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {GroupOrCalendarSettings} from '../types/settings-types'

const ID_REGEX = /^[\w -]+$/
const DESCRIPTION = `Must be unique. Allowed: letters, numbers, spaces, '-' and '_'.`
const DESCRIPTION_DUPLICATE = 'This ID is already in use. Please choose another.'
const DESCRIPTION_INVALID = 'Invalid format! Use only letters, numbers, spaces, hyphens, and underscores.'

export abstract class BaseEntryModificationModal extends Modal {

  protected existingIds: Set<string>

  constructor(readonly plugin: FantasyGanttPlugin,
              existingIds: string[],
              readonly headerDescription: string,
              readonly buttonDescription: string) {
    super(plugin.app)
    this.existingIds = new Set(existingIds)
  }

  abstract isValidId(id: string): boolean

  onOpenHelper(result: GroupOrCalendarSettings,
               onSubmit: (entry: GroupOrCalendarSettings) => void) {

    const {contentEl} = this
    contentEl.empty()
    contentEl.createEl('h2', {text: this.headerDescription})
    contentEl.createDiv({text: 'IDs are case-sensitive.'})

    let addButton: HTMLButtonElement

    const idSetting = new Setting(contentEl).setName('ID')
    .setDesc(DESCRIPTION)
    .addText(text => {
      text.onChange(value => {
        result.id = value.trim()

        /* Validation checks */
        const isNotEmpty = result.id.length > 0
        const isValidFormat = ID_REGEX.test(result.id)
        const isUnique = !this.existingIds.has(result.id)
        const isValidId = this.isValidId(result.id)
        const isOK = isNotEmpty && isValidFormat && isValidId

        /* Toggle error UI feedback */
        idSetting.descEl.toggleClass('is-error', isNotEmpty && !isOK)

        if (isNotEmpty && !isValidFormat) {
          void idSetting.setDesc(DESCRIPTION_INVALID)
        } else if (isValidId && !isUnique) {
          void idSetting.setDesc(DESCRIPTION_DUPLICATE)
        } else {
          void idSetting.setDesc(DESCRIPTION)
        }

        /* Disable/Enable the submit button */
        if (addButton) addButton.disabled = !isValidId || !isOK

      })
    })

    new Setting(contentEl).setDesc('Choose a color').addColorPicker(c =>
      c.setValue(result.color!)
      .onChange(v => result.color = v))

    new Setting(contentEl).addButton(btn => {
      btn.setButtonText(this.buttonDescription)
      .setCta()
      .onClick(() => {
        if (!result.id || addButton.disabled) {
          new Notice('Please enter a valid, unique ID.')
          return
        }

        this.close()
        onSubmit(result)
      })

      addButton = btn.buttonEl
      addButton.disabled = true // Initially disabled until user types a valid ID
    })

  }

  /*
   * Delete when clean. Obsidian does that for us
   * https://docs.obsidian.md/Plugins/User+interface/Modals
   */
  onClose() {
    const {contentEl} = this
    contentEl.empty()
  }

}
