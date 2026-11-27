import {FrontMatterCache, TFile} from 'obsidian'
import {GanttItem, GanttItemDisplayType, RepeatRule, TimeOfDayParsed} from '../types/event-types'

export class GanttItemImpl implements GanttItem {
  predecessors: string[]
  successors: string[]

  repeatRule: RepeatRule | undefined
  isRecurringInstance = false
  parentEventId: string | undefined = undefined
  lane: number | undefined = undefined
  private isEndDateAfterStartDate: boolean

  constructor(readonly id: string,
              readonly name: string,
              // readonly startDate: ParsedDate,
              // readonly endDate: ParsedDate,
              readonly startDateDisplay: string,
              readonly endDateDisplay: string, /* TODO unused */
              readonly startDays: number,
              readonly endDays: number,
              readonly startTimeOfDay: TimeOfDayParsed,
              readonly endTimeOfDay: TimeOfDayParsed,
              readonly group: string,
              readonly displayType: GanttItemDisplayType,
              readonly displayIcon: string | undefined,
              readonly displayIconColor: string,
              readonly calendarType: string,
              readonly color: string | undefined,
              readonly link: string | undefined,
              readonly frontMatter: FrontMatterCache,
              readonly file: TFile) {
    this.predecessors = []
    this.successors = []
    this.isEndDateAfterStartDate = this.endDay >= this.startDay
      && this.endDayWithTimeOfDay > this.startDayWithTimeOfDay
  }

  get isTimeSpan(): boolean {
    return this.isEndDateAfterStartDate
  }

  get startDay(): number {
    return this.startDays
  }

  get endDay(): number {
    return this.endDays
  }

  get startDayWithTimeOfDay(): number {
    return this.startDays + this.startTimeOfDay.value
  }

  get endDayWithTimeOfDay(): number {
    return this.endDays + this.endTimeOfDay.value
  }

  clone(startDays: number, duration: number): GanttItem {
    const endDays = this.endDays ? startDays + duration : startDays
    const clone = new GanttItemImpl(`${this.id}-rep-${startDays}`,
      this.name,
      this.startDateDisplay,
      this.endDateDisplay,
      startDays,
      endDays,
      this.startTimeOfDay,
      this.endTimeOfDay,
      this.group,
      this.displayType,
      this.displayIcon,
      this.displayIconColor,
      this.calendarType, /* todo mv calendarID */
      this.color,
      this.link,
      this.frontMatter,
      this.file
    )

    clone.predecessors = this.predecessors
    clone.successors = this.successors
    clone.repeatRule = this.repeatRule

    clone.isRecurringInstance = true
    clone.parentEventId = this.id
    clone.lane = this.lane

    return clone
  }

}
