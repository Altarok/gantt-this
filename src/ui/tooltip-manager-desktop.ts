import {HoverParent, HoverPopover, Notice} from 'obsidian'
import {GanttItem, PluginSettings} from '../const/types'
import {svgUrl} from '../const/constants'
import {GanttRenderEngine} from '../view/svg-drawer'
import {Util} from '../view/svg-drawer-util'
import {FrontMatterUtil} from '../io/frontmatter-reader'

type VerticalOverlay = { upper: SVGLineElement, lower: SVGLineElement }

export class TooltipManager implements HoverParent {
  hoverPopover: HoverPopover | null = null;
  private verticalGuides: VerticalOverlay[] = []
  private lastHoveredTarget: HTMLElement | null = null
  private highlightElement: SVGElement | null = null
  private lastHoverTarget: HTMLElement | null = null

  constructor(readonly engine: GanttRenderEngine,
              readonly pluginSettings: PluginSettings) {
    this.setupDelegatedHover()
  }

  private setupDelegatedHover() {
    // Single listener on the parent container using mouseover/mouseout for bubble up support
    this.engine.container.addEventListener('mouseover', (evt: MouseEvent) => {

      let hoverData: { target: HTMLElement, ganttItem: GanttItem } | null = this.getTargetAndMatchingEvent(evt)
      if (!hoverData) {
        this.hideTooltip()
        return
      }

      const {target, ganttItem} = hoverData

      /*
       * At THIS point we decided to really show a tooltip
       */

      if (this.lastHoverTarget) delete this.lastHoverTarget.dataset.hasPopover

      /* CTRL key is reserved for native file preview */
      if (evt.ctrlKey) {
        if (this.lastHoverTarget) delete this.lastHoverTarget.dataset.hasPopover
        this.showNativePreview(evt, target, ganttItem.link)
        return
      }

      this.lastHoverTarget = target

      target.dataset.hasPopover = 'true' // mark element to not duplicate popover on internal mouse moves

      this.showHighlightAroundElement(target, ganttItem)
      this.showVerticalGuide(target, ganttItem)

      /* create single popover attached to the hovered event */
      const popover = new HoverPopover(this, target, -1)

      /* populate content based on event data  */
      this.setTooltipContent(ganttItem, popover.hoverEl)

      popover.hoverEl.addEventListener('mouseleave', () => {
        /* Reset marker when popover closes/leaves */
        this.hideTooltip('mouse leave')
        delete target.dataset.hasPopover
      })
    })
  }

  private getTargetAndMatchingEvent(evt: MouseEvent): { target: HTMLElement, ganttItem: GanttItem } | null {

    const target = evt.target as HTMLElement // Find the closest task element (works for SVG rects or HTML bars)
    if (!target?.hasAttribute('data-id')) return this.hideTooltip('not data-id') // is it a gantt chart with data?
    const rawId = target.getAttribute('data-id') // extract data ID (unique)
    if (rawId === null) return this.hideTooltip('data-id is null')
    const id = Number(rawId)
    const ganttItem: GanttItem | undefined = this.engine.rawData.find(d => d.id === id) // is it a GanttItem?
    if (!ganttItem) return this.hideTooltip('target not a GanttItem')

    if (!target) return this.hideTooltip('target missing')
    if (target.dataset.hasPopover === 'true') return this.hideTooltip('target already has a popover') // already hovering said target?

    return {target, ganttItem}
  }

  private setTooltipContent(d: GanttItem, tooltip: HTMLElement) {

    const g = tooltip.createDiv({cls: 'gt-tooltip'})

    g.createDiv({text: d.name, cls: 'gt-tooltip-title'})
    const table = g.createEl('table', {cls: 'gt-tooltip-table'})
    g.createDiv({text: 'Click to open in new tab', cls: 'gt-tooltip-link'})

    const hasSelectedBaseProperties = Boolean((this.engine.selectedFrontmatterProperties?.length ?? 0) > 0)

    if (hasSelectedBaseProperties) {
      const selectedProps = this.engine.selectedFrontmatterProperties!
      this.createBasesTooltipContent(table, d, selectedProps)
    } else {
      table.textContent = this.createFallbackTooltipContent(d)
    }
  }

  private createBasesTooltipContent(table: HTMLTableElement, d: GanttItem, selectedProps: string[]) {
    const properties: { key: string, value: string }[] = FrontMatterUtil.readUnknownProperties(d, selectedProps)
    if (properties.length === 0) return
    for (const p of properties) {
      const row = table.insertRow()
      const cellKey = row.insertCell()
      cellKey.textContent = p.key
      const cellVal = row.insertCell()
      cellVal.textContent = p.value
    }
  }

  private showNativePreview(event: MouseEvent, targetEl: HTMLElement, linktext?: string) {
    if (!linktext) return

    this.engine.plugin.app.workspace.trigger('hover-link', {
      event, targetEl, linktext, source: 'gantt-this', hoverParent: this.engine.container,
    })
  }

  private createFallbackTooltipContent(d: GanttItem): string {
    return d.displayType === 'bar' ? `${d.startDateDisplay} to ${d.endDateDisplay}` : d.startDateDisplay
  }

  private showVerticalGuide(target: HTMLElement, ganttItem: GanttItem) {
    if (!this.pluginSettings.mouseOverEventShowVerticalLine) return
    if (ganttItem.displayType === 'era') return

    const svg = target.closest('svg')
    if (!svg) return

    /* Get the bounding box of the hovered element relative to the SVG container */
    const targetRect = target.getBoundingClientRect()
    const svgRect = svg.getBoundingClientRect()

    if (ganttItem.displayType === 'bar') {
      /* For bars, we want two lines: one at the left edge (start) and one at the right edge (end)
      Note: If your SVG bar element bounds represent the full width, we can use targetRect.left and targetRect.right. */
      const x1 = targetRect.left - svgRect.left
      const x2 = targetRect.right - svgRect.left

      /* Ensure we have two guideline elements */
      this.ensureVerticalGuidesCount(svg, 2)

      if (this.verticalGuides.length === 2) {
        this.updateLine(ganttItem, this.verticalGuides[0]!, x1)
        this.updateLine(ganttItem, this.verticalGuides[1]!, x2)
      }
    } else {
      /* Calculate X position centered on the target element */
      const x = targetRect.left + targetRect.width / 2 - svgRect.left

      this.ensureVerticalGuidesCount(svg, 1)

      if (this.verticalGuides.length === 1) {
        this.updateLine(ganttItem, this.verticalGuides[0]!, x)
      }
    }
  }

  private ensureVerticalGuidesCount(svg: SVGSVGElement, count: number) {
    /* Remove excess if switching from bar to point */
    while (this.verticalGuides.length > count) {
      const lines = this.verticalGuides.pop()
      lines?.upper?.remove()
      lines?.lower?.remove()
    }

    /* Add missing if switching from point to bar */
    while (this.verticalGuides.length < count) {
      const upper = Util.createSvg('line', 'gt-item vertical-overlay', {stroke: this.overlayColor})
      const lower = Util.createSvg('line', 'gt-item vertical-overlay', {stroke: this.overlayColor})
      if (svg.firstChild) {
        svg.insertBefore(upper, svg.firstChild)
        svg.insertBefore(lower, svg.firstChild)
      } else {
        svg.appendChild(upper)
        svg.appendChild(lower)
      }
      this.verticalGuides.push({upper, lower})
    }
  }

  /**
   * Show red, dotted, vertical lines around event on mouseover. Vertical line runs through entire gantt chart (upper half),
   * but will only be visible over calendar related to event (lower half).
   * <p>
   * Param height unused, but keep this for now as there will be a plugin setting for this
   *
   * @param ganttItem
   * @param line
   * @param x
   * @private
   */
  private updateLine(ganttItem: GanttItem, line: VerticalOverlay, x: number) {

    const totalChartHeight = this.engine.calculateTotalChartHeight() + this.engine.config.margin.top

    const xS = String(x)

    line.upper.setAttribute('x1', xS)
    line.upper.setAttribute('y1', String(this.engine.config.margin.top))
    line.upper.setAttribute('x2', xS)
    line.upper.setAttribute('y2', String(totalChartHeight))

    const cal = this.engine.svgDrawerData.drawnCals[ganttItem.calendarType]
    if (cal) { /* should exist */
      line.lower.setAttribute('x1', xS)
      line.lower.setAttribute('y1', String(cal.y1))
      line.lower.setAttribute('x2', xS)
      line.lower.setAttribute('y2', String(cal.y2))
    }
  }

  /** Remove vertical line. */
  private hideVerticalGuide() {
    for (const lines of this.verticalGuides) {
      lines?.upper?.remove()
      lines?.lower?.remove()
    }
    this.verticalGuides = []
  }

  /** Show box around hovered element. */
  private showHighlightAroundElement(target: HTMLElement, ganttItem: GanttItem) {
    if (!this.pluginSettings.mouseOverEventShowBox) return

    if (this.lastHoveredTarget && this.lastHoveredTarget !== target) {
      if (this.highlightElement) {
        this.highlightElement.remove()
        this.highlightElement = null
      }
    }

    if (ganttItem.displayType === 'era') return
    // if (ganttItem.displayType === 'bar' || ganttItem.displayType === 'box') return
    if (ganttItem.displayType === 'vertical-line') return

    this.lastHoveredTarget = target
    const svg = target.closest('svg')
    if (!svg) return

    const svgRect = svg.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const x = targetRect.left - svgRect.left
    const y = targetRect.top - svgRect.top
    const width = targetRect.width
    const height = targetRect.height

    if (!this.highlightElement) {
      this.highlightElement = window.document.createElementNS(svgUrl, 'g')
      svg.appendChild(this.highlightElement)
    }

    this.highlightElement.innerHTML = ''
    let shape: SVGElement
    let points: string

    const centreX = x + width / 2
    const centreY = y + height / 2

    if (ganttItem.displayType === 'bar' || ganttItem.displayType === 'box') {
      shape = Util.createSvg('rect', 'gt-item symbol-hover', {
        x: x - 1, y: y - 1, width: width + 2, height: height + 2, stroke: this.overlayColor
      })
    } else if (ganttItem.displayType === 'point') {
      shape = Util.createSvg('circle', 'gt-item symbol-hover', {
        cx: String(centreX), cy: String(centreY), r: String(width / 2 + 3), stroke: this.overlayColor
      })
    } else {
      points = this.calculatePolygonPointsForOverlay(centreX, centreY, ganttItem.displayType)
      shape = Util.createSvg('polygon', 'gt-item symbol-hover', {points, stroke: this.overlayColor})
    }
    this.highlightElement.appendChild(shape)
  }

  private calculatePolygonPointsForOverlay(x: number, y: number, symbol: 'triangle' | 'diamond' | 'pentagon' | 'hexagon' | 'octagon' | 'star') {
    switch (symbol) {
      case 'triangle':
        return Util.calculatePolygonPoints(11, x, y + 2, 3)
      case 'diamond':
        return Util.calculatePolygonPoints(11, x, y, 4)
      case 'pentagon':
        return Util.calculatePolygonPoints(11, x, y + 1, 5)
      case 'hexagon':
        return Util.calculatePolygonPoints(11, x, y, 6)
      case 'octagon':
        return Util.calculatePolygonPoints(11, x, y, 8, 1, 1 / 8)
      case 'star':
        return Util.calculatePolygonPoints(12, x, y + 1, 10, 0.382)
    }
  }

  private hideHighlightAroundElement() {
    if (this.highlightElement) {
      this.highlightElement.remove()
      this.highlightElement = null
    }
    if (this.lastHoveredTarget) {
      this.lastHoveredTarget = null
    }
  }

  /* Clean up if mouse drifted off a data element onto empty SVG space */
  hideTooltip(_msg?: string): null {
    if (this.lastHoverTarget) delete this.lastHoverTarget.dataset.hasPopover
    // if (msg) new Notice(`Hide tooltip: ${msg}`)
    this.hideHighlightAroundElement()
    this.hideVerticalGuide()
    return null
  }

  get settings(): PluginSettings {
    return this.engine.plugin.settings
  }

  get overlayColor(): string {
    return this.settings.uxVerticalOverlayColor
  }
}
