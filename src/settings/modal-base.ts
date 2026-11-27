import {Modal, Notice, Setting} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {GroupOrCalendarSettings} from '../types/settings-types'
import {debug} from '../util/debug'

const ID_REGEX = /^[\w -]+$/
const DESCRIPTION = `Must be unique. Allowed: letters, numbers, spaces, '-' and '_'.`
const DESCRIPTION_DUPLICATE = 'This ID is already in use. Please choose another.'
const DESCRIPTION_INVALID = 'Invalid format! Use only letters, numbers, spaces, hyphens, and underscores.'

export abstract class BaseEntryModificationModal extends Modal {

  protected existingIds: Set<string>
  private isIdValid = false
  private isIdChanged = false
  private isChangedColor = false


  protected constructor(readonly plugin: FantasyGanttPlugin,
                        existingIds: string[],
                        readonly headerDescription: string,
                        readonly buttonDescription: string) {
    super(plugin.app)
    this.existingIds = new Set(existingIds)
  }

  onOpenHelper(userInput: Readonly<GroupOrCalendarSettings>,
               onSubmit: (entry: GroupOrCalendarSettings) => void) {

    const output: GroupOrCalendarSettings = {
      id: userInput.id,
      visible: userInput.visible,
      color: userInput.color
    }

    const {contentEl} = this
    contentEl.empty()
    contentEl.createEl('h2', {text: this.headerDescription})
    contentEl.createDiv({text: 'IDs are case-sensitive.'})

    let addButton: HTMLButtonElement


    const idSetting = new Setting(contentEl).setName('ID')
    .setDesc(DESCRIPTION)
    .addText(text => {
      text.setValue(output.id)
      .onChange(value => {
        output.id = value.trim()
        this.evaluateIdInput(output.id, userInput.id, idSetting)
        this.toggleButtonEnabled(addButton)
      })
    })

    this.evaluateIdInput(output.id, userInput.id, idSetting)

    new Setting(contentEl).setDesc('Choose a color').addColorPicker(c =>
      c.setValue(output.color!)
      .onChange(v => {
        output.color = v
        this.isChangedColor = v !== userInput.color
        this.toggleButtonEnabled(addButton)
      }))

    new Setting(contentEl).addButton(btn => {
      btn.setButtonText(this.buttonDescription)
      .setCta()
      .onClick(() => {
        if (!output.id || addButton.disabled) {
          new Notice('Please enter a valid, unique ID.')
          return
        }

        this.close()
        onSubmit(output)
      })

      addButton = btn.buttonEl
      addButton.disabled = true // Initially disabled until user types a valid ID or changes color
    })

  }

  /**
   * Evaluate ID input. Deactivate button if ID is empty, invalid or not unique.
   *
   * @param id
   * @param initialId
   * @param idSetting
   * @private
   */
  private evaluateIdInput(id: string, initialId: string, idSetting: Setting) {
    /* Validation checks */
    const isNotEmpty = id.length > 0
    const isValidFormat = ID_REGEX.test(id)
    const isUnique = !this.existingIds.has(id)

    this.isIdChanged = id !== initialId
    this.isIdValid = isNotEmpty && isValidFormat && (isUnique || !this.isIdChanged)

    if (!idSetting) return

    /* Toggle error UI feedback */
    idSetting.descEl.toggleClass('is-error', isNotEmpty && !this.isIdValid)

    if (isNotEmpty && !isValidFormat) {
      void idSetting.setDesc(DESCRIPTION_INVALID)
    } else if (this.isIdChanged && !isUnique) {
      void idSetting.setDesc(DESCRIPTION_DUPLICATE)
    } else {
      void idSetting.setDesc(DESCRIPTION)
    }
  }

  /*
   * Delete when clean. Obsidian does that for us
   * https://docs.obsidian.md/Plugins/User+interface/Modals
   */
  onClose() {
    const {contentEl} = this
    contentEl.empty()
  }

  /**
   * Disable/Enable the submit button depending on input. The validity of the ID has higher priority than the color.
   * Will get disabled if the ID input is invalid. If valid, and potentially unchanged, the state of the color change
   * decides whether the button is to be disabled.
   */
  private toggleButtonEnabled(addButton: HTMLButtonElement) {
    debug.info(`toggleButtonEnabled >> isIdValid '${this.isIdValid}' isIdChanged '${this.isIdChanged}' isChangedColor '${this.isChangedColor}'`)
    if (!addButton) return
    if (!this.isIdValid) addButton.disabled = true
    else if (this.isIdChanged) addButton.disabled = false
    else addButton.disabled = !this.isChangedColor
  }
}
