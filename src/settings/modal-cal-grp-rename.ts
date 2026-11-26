import FantasyGanttPlugin from '../main'
import {GroupOrCalendarSettings} from '../types/settings-types'
import {BaseEntryModificationModal} from './modal-base'

export class RenameEntryModal extends BaseEntryModificationModal {

  constructor(plugin: FantasyGanttPlugin,
              existingIds: string[],
              readonly itemToBeChanged: GroupOrCalendarSettings,
              readonly onSubmit: (entry: GroupOrCalendarSettings) => void) {
    super(plugin, existingIds,
      'Change item',
      'Save')
  }

  onOpen() {

    const input: GroupOrCalendarSettings = {
      id: this.itemToBeChanged.id,
      visible: this.itemToBeChanged.visible,
      color: this.itemToBeChanged.color
    }

    super.onOpenHelper(input, this.onSubmit)

  }

}
