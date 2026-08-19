import {ControlKey, GanttItem} from '../const/types'
import {Css, svgUrl} from '../const/constants'
import {GanttRenderEngine} from './svg-drawer'
import {GanttEventManager} from './event-manager'
import {Util} from './svg-drawer-util'
import {FrontMatterUtil} from "../io/frontmatter-reader";

export class GanttDesktopEventManager implements GanttEventManager {
  public isDragging = false

  private startX = 0
  private startTranslateX = 0
  private rafId: number | null = null
  private currentSvg: SVGElement | null = null
  private verticalGuides: { upper: SVGLineElement, lower: SVGLineElement }[] = []
  private lastHoveredTarget: HTMLElement | null = null
  private highlightElement: SVGElement | null = null

  /* Bound handler references for clean removal */
  private readonly boundWindowMouseMove: (e: MouseEvent) => void
  private readonly boundWindowMouseUp: (e: MouseEvent) => void
  private readonly boundSvgMouseDown: (e: MouseEvent) => void
  private readonly boundSvgWheel: (e: WheelEvent) => void
  private readonly boundSvgMouseOver: (e: MouseEvent) => void
  private readonly boundSvgMouseMove: (e: MouseEvent) => void
  private readonly boundSvgMouseLeave: () => void
  private readonly boundSvgClick: (e: MouseEvent) => void

  constructor(private engine: GanttRenderEngine,
              readonly autoRestrictZoom: boolean,
              readonly mouseOverEventShowBox: boolean,
              readonly mouseOverEventShowVerticalLine: boolean,
              readonly uxZoomButton: ControlKey,
              readonly uxPanButton: ControlKey) {
    /* Bind all handlers _once_ */
    this.boundWindowMouseMove = this.handleWindowMouseMove.bind(this)
    this.boundWindowMouseUp = this.handleWindowMouseUp.bind(this)
    this.boundSvgMouseDown = this.handleSvgMouseDown.bind(this)
    this.boundSvgWheel = this.handleSvgWheel.bind(this)
    this.boundSvgMouseOver = this.handleSvgMouseOver.bind(this)
    this.boundSvgMouseMove = this.handleSvgMouseMove.bind(this)
    this.boundSvgMouseLeave = this.handleSvgMouseLeave.bind(this)
    this.boundSvgClick = this.handleSvgClick.bind(this)

    this.initGlobalListeners()
    this.attachSvgListeners()
  }

  private initGlobalListeners() {
    window.addEventListener('mousemove', this.boundWindowMouseMove)
    window.addEventListener('mouseup', this.boundWindowMouseUp)
  }

  private activeWindow: Window | null = null

  public attachSvgListeners() {
    this.detachListeners()

    this.currentSvg = this.engine.svg
    if (!this.currentSvg) return

    this.activeWindow = this.currentSvg.ownerDocument.defaultView ?? window
    const plugin = this.engine.plugin

    plugin.registerDomEvent(this.activeWindow, 'mousemove', this.boundWindowMouseMove)
    plugin.registerDomEvent(this.activeWindow, 'mouseup', this.boundWindowMouseUp)
    plugin.registerDomEvent(this.activeWindow, 'blur', () => this.hideTooltip(/*'window blur'*/))

    const svgEl = this.currentSvg as unknown as HTMLElement

    plugin.registerDomEvent(svgEl, 'mousedown', this.boundSvgMouseDown)
    plugin.registerDomEvent(svgEl, 'wheel', this.boundSvgWheel, {passive: false})
    plugin.registerDomEvent(svgEl, 'mouseover', this.boundSvgMouseOver)
    plugin.registerDomEvent(svgEl, 'mousemove', this.boundSvgMouseMove)
    plugin.registerDomEvent(svgEl, 'mouseleave', this.boundSvgMouseLeave)
    plugin.registerDomEvent(svgEl, 'click', this.boundSvgClick)
  }

  private detachListeners() {
    if (this.activeWindow) {
      this.activeWindow.removeEventListener('mousemove', this.boundWindowMouseMove)
      this.activeWindow.removeEventListener('mouseup', this.boundWindowMouseUp)
      this.activeWindow = null
    }

    if (this.currentSvg) {
      this.currentSvg.removeEventListener('mousedown', this.boundSvgMouseDown)
      this.currentSvg.removeEventListener('wheel', this.boundSvgWheel)
      this.currentSvg.removeEventListener('mouseover', this.boundSvgMouseOver)
      this.currentSvg.removeEventListener('mousemove', this.boundSvgMouseMove)
      this.currentSvg.removeEventListener('mouseleave', this.boundSvgMouseLeave)
      this.currentSvg.removeEventListener('click', this.boundSvgClick)
      this.currentSvg = null
    }
  }

  private get activeDocument(): Document {
    return this.currentSvg?.ownerDocument ?? window.document
  }

  private handleWindowMouseMove(e: MouseEvent) {
    /* Set coordinates for tooltip*/
    // const doc = this.activeDocument
    // doc.documentElement.style.setProperty('--mouse-x', `${e.clientX + 15}px`)
    // doc.documentElement.style.setProperty('--mouse-y', `${e.clientY + 15}px`)

    if (this.isDragging) {
      const deltaX = e.clientX - this.startX
      this.engine.zoomTranslateX = this.startTranslateX + deltaX

      this.rafId ??= window.requestAnimationFrame(() => {
        const width = this.engine.container.clientWidth || 800
        this.engine.renderData(width)
        this.engine.drawAxes(width)
        this.rafId = null
      })
    }
  }

  private handleSvgMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).hasAttribute('data-id')) return
    this.isDragging = true
    this.startX = e.clientX
    this.startTranslateX = this.engine.zoomTranslateX
  }

  private isModifierActive(e: WheelEvent, key: ControlKey): boolean {
    switch (key) {
      case 'ctrl':
        return e.ctrlKey
      case 'alt':
        return e.altKey
      case 'shift':
        return e.shiftKey
    }
  }

  private handleSvgWheel(e: WheelEvent) {
    if (!this.currentSvg) return

    if (this.isModifierActive(e, this.uxZoomButton)) {
      e.preventDefault()
      this.zoom(e)
    } else if (this.isModifierActive(e, this.uxPanButton)) {
      e.preventDefault()
      this.pan(e)
    }
  }

  private pan(e: WheelEvent) {
    this.engine.zoomTranslateX = this.engine.zoomTranslateX - Math.floor(e.deltaY / 2)

    // Pan horizontally (and vertically if your timeline pans Y-axis too)
    this.rafId ??= window.requestAnimationFrame(() => {
      const width = this.engine.container.clientWidth || 800
      this.engine.renderData(width)
      this.engine.drawAxes(width)
      this.rafId = null
    })
    return
  }

  private zoom(e: WheelEvent) {
    if (!this.currentSvg) return
    const width = this.engine.container.clientWidth || 800
    const rect = this.currentSvg.getBoundingClientRect()
    const mouseX = e.clientX - rect.left - this.engine.config.margin.left

    let zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    if (this.autoRestrictZoom && this.engine.stepDays < 2 && zoomFactor > 1) zoomFactor = 1
    let nextScale = this.engine.zoomScale * zoomFactor
    if (this.autoRestrictZoom && nextScale < 0.5) nextScale = 0.5

    this.engine.zoomTranslateX = mouseX - (mouseX - this.engine.zoomTranslateX) * (nextScale / this.engine.zoomScale)
    this.engine.zoomScale = nextScale

    this.engine.renderData(width)
    this.engine.drawAxes(width)
  }

  private handleSvgMouseOver(e: MouseEvent): void {
    this.showOrHideTooltip(e)
  }

  private handleSvgMouseMove(e: MouseEvent): void {
    this.showOrHideTooltip(e)
  }

  private showOrHideTooltip(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (!target?.hasAttribute('data-id')) return this.hideTooltip()

    const rawId = target.getAttribute('data-id')
    if (rawId === null) return this.hideTooltip()
    const id = Number(rawId)
    const dataObj = this.engine.rawData.find(d => d.id === id)
    if (!dataObj) return this.hideTooltip()

    if (e.ctrlKey) {
      this.hideTooltip()
      this.showNativePreview(e, target, dataObj.link)
    } else {
      this.showCustomTooltip(dataObj, e)
      this.showHighlightAroundElement(target, dataObj)
      this.showVerticalGuide(target, dataObj)
    }
  }


  private handleSvgMouseLeave() {
    this.hideTooltip()
  }

  /* Clean up if mouse drifted off a data element onto empty SVG space */
  private hideTooltip() {
    this.engine.tooltip.classList.remove(Css.tooltip.isActive)
    this.hideHighlightAroundElement()
    this.hideVerticalGuide()
  }

  private handleSvgClick(event: MouseEvent) {
    const target = event.target as HTMLElement

    if (target?.hasAttribute('data-id')) {
      const rawId = target.getAttribute('data-id')
      if (rawId === null) return
      const id = Number(rawId)
      const link = this.engine.rawData.find(d => d.id === id)?.link
      if (link) {
        void this.engine.plugin.app.workspace.openLinkText(link, '', true)
      }
    }
  }

  private showNativePreview(event: MouseEvent, target: HTMLElement, link?: string) {
    if (!link) return

    this.engine.plugin.app.workspace.trigger('hover-link', {
      event,
      source: 'gantt-this',
      hoverParent: this.engine.container,
      targetEl: target,
      linktext: link,
    })
  }

  private showCustomTooltip(d: GanttItem, event: MouseEvent) {
    if (d.displayType === 'era') return

    const doc = this.activeDocument
    const tooltip = this.engine.tooltip

    if (tooltip.ownerDocument !== doc) {
      tooltip.remove()
      doc.body.appendChild(tooltip)
    }

    this.clearTooltip()
    this.setTooltipTitle(d)
    this.setTooltipContent(d)

    tooltip.style.left = `${event.clientX + 15}px`
    tooltip.style.top = `${event.clientY + 15}px`

    this.engine.tooltip.classList.add(Css.tooltip.isActive)

    if (d.link) {
      this.engine.tooltip.setAttribute('data-link', d.link)
    } else {
      this.engine.tooltip.removeAttribute('data-link')
    }
  }

  private clearTooltip() {
    this.engine.hoverTitle.textContent = ''
    this.engine.hoverDates.textContent = ''
  }

  private setTooltipTitle(d: GanttItem) {
    this.engine.hoverTitle.textContent = d.name // `Day ${d.startDays}: ${d.name}`
  }

  private setTooltipContent(d: GanttItem) {

    const hasSelectedBaseProperties = Boolean((this.engine.selectedFrontmatterProperties?.length ?? 0) > 0)

    if (hasSelectedBaseProperties) {
      const selectedProps = this.engine.selectedFrontmatterProperties!
      this.createBasesTooltipContent(d, selectedProps)
    } else {
      this.engine.hoverDates.textContent = this.createFallbackTooltipContent(d)
    }
  }

  private createBasesTooltipContent(d: GanttItem, selectedProps: string[]) {
    const properties: { key: string, value: string }[]
      = FrontMatterUtil.readUnknownProperties(d, selectedProps)

    if (properties.length === 0) return

    const table = window.createEl('table')
    table.addClass('gantt-tooltip-table') // Easy to target with CSS

    for (const p of properties) {
      // If 'item' is a formatted string like "Key: Value", split it; otherwise adapt to your data shape
      // const [key, ...valueParts] = item.split(':')
      // const value = valueParts.join(':').trim()

      const row = table.insertRow()

      const cellKey = row.insertCell()
      cellKey.textContent = p.key

      const cellVal = row.insertCell()
      cellVal.textContent = p.value
    }

    this.engine.hoverDates.appendChild(table)
  }

  private createFallbackTooltipContent(d: GanttItem): string {
    return d.displayType === 'bar' ? `${d.startDateDisplay} to ${d.endDateDisplay}` : d.startDateDisplay
  }

  private handleWindowMouseUp() {
    if (this.isDragging) {
      this.isDragging = false
      this.hideTooltip(/*'handleWindowMouseUp'*/)
    }
    this.stopAnimation()
  }

  /** Fully unhook and release all window and SVG listeners to prevent leaks */
  public destroy() {
    this.stopAnimation()
    this.detachListeners()
  }

  private stopAnimation() {
    if (this.rafId === null) return
    window.cancelAnimationFrame(this.rafId)
    this.rafId = null
  }

  private showVerticalGuide(target: HTMLElement, ganttItem: GanttItem) {
    if (!this.mouseOverEventShowVerticalLine) return
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
        this.updateLine(ganttItem, this.verticalGuides[0]!, x1/* , svg.clientHeight */)
        this.updateLine(ganttItem, this.verticalGuides[1]!, x2/* , svg.clientHeight */)
      }
    } else {
      /* Calculate X position centered on the target element */
      const x = targetRect.left + targetRect.width / 2 - svgRect.left

      this.ensureVerticalGuidesCount(svg, 1)

      if (this.verticalGuides.length === 1) {
        this.updateLine(ganttItem, this.verticalGuides[0]!, x/* , svg.clientHeight */)
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
      const upper = Util.createSvg('line', 'gt-item vertical-overlay'/* , {'pointer-events': 'none'} */)
      const lower = Util.createSvg('line', 'gt-item vertical-overlay'/* , {'pointer-events': 'none'} */)
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
   * @param lines
   * @param x
   * @private
   */
  private updateLine(ganttItem: GanttItem, lines: {
    upper: SVGLineElement,
    lower: SVGLineElement
  }, x: number/* , height: number */) {

    const totalChartHeight = this.engine.calculateTotalChartHeight() + this.engine.config.margin.top

    lines.upper.setAttribute('x1', String(x))
    lines.upper.setAttribute('y1', `${this.engine.config.margin.top}`)
    lines.upper.setAttribute('x2', String(x))
    lines.upper.setAttribute('y2', String(totalChartHeight))

    const cal = this.engine.svgDrawerData.drawnCals[ganttItem.calendarType]
    if (cal) {
      lines.lower.setAttribute('x1', String(x))
      lines.lower.setAttribute('y1', String(cal.y1))
      lines.lower.setAttribute('x2', String(x))
      lines.lower.setAttribute('y2', String(cal.y2))
    }
  }

  /** Remove vertical red line. */
  private hideVerticalGuide() {
    for (const lines of this.verticalGuides) {
      lines?.upper?.remove()
      lines?.lower?.remove()
    }
    this.verticalGuides = []
  }

  /** Show red box around hovered element. */
  private showHighlightAroundElement(target: HTMLElement, ganttItem: GanttItem) {
    if (!this.mouseOverEventShowBox) return

    if (this.lastHoveredTarget && this.lastHoveredTarget !== target) {
      if (this.highlightElement) {
        this.highlightElement.remove()
        this.highlightElement = null
      }
    }

    if (ganttItem.displayType === 'era') return
    if (ganttItem.displayType === 'bar' || ganttItem.displayType === 'box') return
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

    if (ganttItem.displayType === 'point') {
      shape = Util.createSvg('circle', 'gt-item timestamp symbol-hover', {
        cx: String(x + width / 2), cy: String(y + height / 2), r: String(width / 2 + 3)
      })
    } else {
      const centreX = x + width / 2
      const centreY = y + height / 2
      points = this.calculatePolygonPointsForOverlay(centreX, centreY, ganttItem.displayType)
      shape = Util.createSvg('polygon', 'gt-item timestamp symbol-hover', {points})
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

//  private get pluginSettings() {
//    return this.engine.plugin.settings
//  }

}
