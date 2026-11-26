import FantasyGanttPlugin from '../main'
import {GroupOrCalendarSettings} from '../types/settings-types'
import {BaseEntryModificationModal} from './modal-base'
import {getRandomHexColor} from './settings-util'

export class AddEntryModal extends BaseEntryModificationModal {

  constructor(plugin: FantasyGanttPlugin,
              existingIds: string[],
              readonly onSubmit: (entry: GroupOrCalendarSettings) => void) {
    super(plugin, existingIds,
      'Add new item',
      'Add')
  }

  onOpen() {

    const input: GroupOrCalendarSettings = {
      id: '',
      visible: true,
      color: getRandomHexColor()
    }

    super.onOpenHelper(input, this.onSubmit)

  }

}
