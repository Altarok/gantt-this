import {BasesView, Notice, QueryController} from 'obsidian'
import {GanttRender} from './view/svg-drawer-prestep'
import {BaseKeys, CodeBlockContent} from './const/types'
import FantasyGanttPlugin from './main'
import {FrontMatterUtil} from './io/frontmatter-reader'

/*
 * TODO change to 'gantt-this-view'
 * Sadly, this is a breaking change for users!
 * They'd have to manually change the base file.
 */
export const GanttBaseViewExampleName = 'example-view'

export class GanttThisBasesView extends BasesView {
  readonly type = GanttBaseViewExampleName
  private readonly containerEl: HTMLElement


  constructor(readonly plugin: FantasyGanttPlugin,
              readonly controller: QueryController,
              parentEl: HTMLElement) {
    super(controller)
    this.containerEl = parentEl.createDiv('bases-example-view-container')
  }

  public onDataUpdated(): void {
    this.containerEl.empty()
    const files = this.preFilterFiles()

    /* Omit event path stuff - use base filters instead! */
    const codeBlockContent: CodeBlockContent = {
      calendarPath: this.calendarPath,
      calendarPathSearchRecursive: this.calendarPathSearchRecursive,
      lowerBoundDate: this.lowerBoundDate,
      upperBoundDate: this.upperBoundDate
    }

    const selectedProperties: string[] = this.config.getOrder()
    const selectedFronMatterProperties = selectedProperties
    .map(s => {
        if (s.startsWith('formula.')) return s.slice(8)
        else if (s.startsWith('file.') || s.startsWith('note.')) return s.slice(5)
        else return ''
      }
    ).filter(Boolean)

    const render = new GanttRender(this.plugin, files, selectedFronMatterProperties)

    try {
      void render.renderGantt(this.containerEl, this.plugin.settings, codeBlockContent, undefined)
    } catch {
      new Notice('Failed to render Gantt chart base!')
    }
  }

  private preFilterFiles() {
    const isCheckboxMarkerOptional = this.plugin.settings.frontMatterProperty_gantt_this_optional

    /* Pre-filter files */
    return this.data.data.map(entry => entry.file)
    .filter(file => {
      const cache = this.plugin.app.metadataCache.getFileCache(file)
      const frontmatter = cache?.frontmatter
      if (!frontmatter) {
        debugger
        return false
      }

      const hasStartDate = this.plugin.settings.useFilenameAsFallbackStartDate || FrontMatterUtil.hasStartDate(frontmatter, this.plugin.settings)
      const hasValidMarker = isCheckboxMarkerOptional || FrontMatterUtil.isFileMarkedAsEvent(frontmatter, this.plugin.settings)

      // Check if note contains the required frontmatter properties
      return hasStartDate && hasValidMarker
    })
  }

  private getStringValue(key: string): string | undefined {
    return this.config.get(key) ? String(this.config.get(key)) : undefined
  }

  private getBoolValue(key: string): boolean | undefined {
    return this.config.get(key) ? this.config.get(key) === true : undefined
  }

  private get calendarPath(): string {
    return this.getStringValue(BaseKeys.calPath) ?? this.plugin.settings.calendarPath
  }

  private get calendarPathSearchRecursive(): boolean {
    return this.getBoolValue(BaseKeys.calPathRec) ?? this.plugin.settings.calendarPathSearchRecursive
  }

  private get lowerBoundDate(): string | undefined {
    return this.getStringValue(BaseKeys.lbd)
  }

  private get upperBoundDate(): string | undefined {
    return this.getStringValue(BaseKeys.ubd)
  }

  /*
   * TODO test code used to overwrite toolbar
   */
// private toolbarEl: HTMLElement | null = null
//  onload(): void {
//    super.onload()
//    this.injectToolbarButton()
//  }
//
//  private injectToolbarButton(): void {
//    // Find the container parent of your view to locate the sibling toolbar
//    const viewEl = this.containerEl.closest('.bases-view') || this.containerEl.parentElement
//    const toolbar = viewEl?.parentElement?.querySelector('.bases-toolbar')
//
//
//    // Prevent duplicate buttons when onDataUpdated fires multiple times
//    if (!toolbar || toolbar.querySelector('.bases-toolbar-gantt-custom')) return
//
//    /*
//     * TODO evtl frueher setzen
//     *
//     * const newItem = toolbar.querySelector('.bases-toolbar-new-item-menu')
//if (newItem) {
//  toolbar.insertBefore(customItem, newItem)
//} else {
//  toolbar.appendChild(customItem)
//}
//     *
//     *
//     * oder nach properties
//     *
//     * const propsItem = toolbar.querySelector('.bases-toolbar-properties-menu')
//if (propsItem?.nextSibling) {
//  toolbar.insertBefore(customItem, propsItem.nextSibling)
//}
//     *
//     */
//
//    // Create the outer wrapper matching Bases toolbar item structure
//    const customItem = toolbar.createDiv({
//      cls: 'bases-toolbar-item bases-toolbar-gantt-custom'
//    })
//
//    // Create the inner button matching Obsidian/Bases button structure
//    const button = customItem.createDiv({
//      cls: 'text-icon-button',
//      attr: {tabindex: '0', role: 'button', 'aria-label': 'Reset Zoom'}
//    })
//
//    const iconSpan = button.createSpan({cls: 'text-button-icon'})
//    setIcon(iconSpan, 'lucide-rotate-ccw') // Using standard Obsidian Lucide icons
//
//    button.createSpan({
//      cls: 'text-button-label',
//      text: 'Reset Zoom'
//    })
//
//    // Event Handler
//    this.plugin.registerDomEvent(button, 'click', (evt: MouseEvent) => {
//      evt.preventDefault()
//      this.handleCustomAction()
//    })
//
//    // Keyboard navigation support (Enter / Space)
//    this.plugin.registerDomEvent(button, 'keydown', (evt: KeyboardEvent) => {
//      if (evt.key === 'Enter' || evt.key === ' ') {
//        evt.preventDefault()
//        this.handleCustomAction()
//      }
//    })
//  }
//
//  private handleCustomAction(): void {
//    // Custom action logic here (e.g., reset SVG zoom, trigger refresh)
//  }
//
//  onunload(): void {
//    // Clean up DOM injections when the view closes
//    this.toolbarEl?.remove()
//    super.onunload()
//  }

}
