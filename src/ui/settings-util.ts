import {ColorComponent, Setting} from 'obsidian'

const VISIBLE_ICON = 'eye' /* an open eye */
const INVISIBLE_ICON = 'eye-off' /* an open eye, but with strike through */


export function addVisibilityToggleButton(setting: Setting, initialVisibility: boolean, saveSettingsCallback: (value: boolean) => Promise<void>) {

  let visible = initialVisibility

  setting.addButton(btn => btn.setIcon(visible ? VISIBLE_ICON : INVISIBLE_ICON).setTooltip('Click to toggle visibility', {delay: -1})
    .onClick(async () => {
      visible = !visible
      void btn.setIcon(visible ? VISIBLE_ICON : INVISIBLE_ICON)
      await saveSettingsCallback(visible)
    })
  )

}

export function addColorPickerFollowedByResetButton(setting: Setting, color: string, fallbackColor: string, saveSettingsCallback: (value?: string) => Promise<void>) {

  let clrPicker: ColorComponent

  setting.addColorPicker(cc => clrPicker = cc.setValue(color)
    .onChange(async (value) => await saveSettingsCallback(value))
  )

  setting.addButton(btn => btn.setIcon('rotate-ccw').setTooltip('Reset color', {delay: -1})
    .onClick(async () => {
      clrPicker.setValue(fallbackColor)
      await saveSettingsCallback(undefined)
    })
  )

}

export function addVerticalMovementButtonsForPriority(setting: Setting, isLowestPriority: boolean, isHighestPriority: boolean,
                                                      lowerPriorityCallback: () => Promise<void>, raisePriorityCallback: () => Promise<void>) {

  setting.addButton(btn => btn.setIcon('chevron-down')
    .setTooltip(isLowestPriority ? 'Can not lower further' : 'Lower priority by 1', {delay: -1})
    .setDisabled(isLowestPriority)
    .onClick(async () => lowerPriorityCallback())
  )

  setting.addButton(btn => btn.setIcon('chevron-up')
    .setTooltip(isHighestPriority ? 'Can not raise further' : 'Raise priority by 1', {delay: -1})
    .setDisabled(isHighestPriority)
    .onClick(async () => raisePriorityCallback())
  )

}

export function addDeleteButton(setting: Setting, isDeletable: boolean, nonDeletableEntryWarning: string, saveSettingsCallback: () => Promise<void>) {

  setting.addButton(btn => btn.setIcon('trash-2').setWarning()
    .setTooltip(isDeletable ? 'Delete' : nonDeletableEntryWarning, {delay: -1})
    .setDisabled(!isDeletable)
    .onClick(async () => await saveSettingsCallback())
  )

}

export function addCreateSetting(setting: Setting, createWhat: string, saveSettingsCallback: (value: string) => Promise<void>) {

  let currentInput = ''

  setting.setName(`Add ${createWhat}`).setDesc('Default color will be assigned.')
  .addText(text => text
    .setPlaceholder('New name')
    .onChange(val => currentInput = val.trim().toLowerCase())
  )
  .addExtraButton(eb => eb.setIcon('save')
    .onClick(async () => {
        if (currentInput) await saveSettingsCallback(currentInput)
      }
    )
  )

}

