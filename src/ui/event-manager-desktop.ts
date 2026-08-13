import {GanttItem} from '../const/types'
import {Css, svgUrl} from '../const/constants'
import {GanttRenderEngine} from './svg-drawer'
import {GanttEventManager} from './event-manager'
import {Util} from './svg-drawer-util'

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
  private readonly boundWindowMouseUp: () => void
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
              readonly uxSwitchZoomAndPan: boolean) {
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
    this.activeWindow.addEventListener('mousemove', this.boundWindowMouseMove)
    this.activeWindow.addEventListener('mouseup', this.boundWindowMouseUp)

    this.currentSvg.addEventListener('mousedown', this.boundSvgMouseDown)
    this.currentSvg.addEventListener('wheel', this.boundSvgWheel, {passive: false})
    this.currentSvg.addEventListener('mouseover', this.boundSvgMouseOver)
    this.currentSvg.addEventListener('mousemove', this.boundSvgMouseMove)
    this.currentSvg.addEventListener('mouseleave', this.boundSvgMouseLeave)
    this.currentSvg.addEventListener('click', this.boundSvgClick)
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
    const doc = this.activeDocument
    doc.documentElement.style.setProperty('--mouse-x', `${e.clientX + 15}px`)
    doc.documentElement.style.setProperty('--mouse-y', `${e.clientY + 15}px`)

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

  private handleSvgWheel(e: WheelEvent) {
    e.preventDefault()
    if (!this.currentSvg) return

    if (e.ctrlKey || e.metaKey) {
      if (this.uxSwitchZoomAndPan) this.zoom(e)
      else this.pan(e)
    } else {
      if (this.uxSwitchZoomAndPan) this.pan(e)
      else this.zoom(e)
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

  private handleSvgMouseOver(event: MouseEvent) {
    const target = event.target as HTMLElement
    if (target?.hasAttribute('data-id')) {
      const rawId = target.getAttribute('data-id')
      if (rawId === null) return
      const id = Number(rawId)
      const dataObj = this.engine.rawData.find(d => d.id === id)
      if (dataObj) {
        this.showTooltip(dataObj)
        this.showHighlightAroundElement(target, dataObj)
        this.showVerticalGuide(target, dataObj)
      }
    }
  }

  private handleSvgMouseMove(event: MouseEvent) {
    const target = event.target as HTMLElement
    if (target?.hasAttribute('data-id')) {
      /* classList.contains() throws a runtime exception on strings containing spaces */
      if (!this.engine.tooltip.classList.contains(Css.tooltip.isActive)) {
        const rawId = target.getAttribute('data-id')
        if (rawId === null) return
        const id = Number(rawId)
        const dataObj = this.engine.rawData.find(d => d.id === id)
        if (dataObj) this.showTooltip(dataObj)
      }
    } else {
      this.engine.tooltip.classList.remove(Css.tooltip.isActive)

      /* Clean up if mouse drifted off a data element onto empty SVG space */
      this.hideHighlightAroundElement()

      this.hideVerticalGuide()
    }
  }

  private handleSvgMouseLeave() {
    this.engine.tooltip.classList.remove(Css.tooltip.isActive)

    /* Clean up using the tracked reference instead of event.target */
    this.hideHighlightAroundElement()

    /* Remove the vertical guideline */
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

  private showTooltip(d: GanttItem) {
    if (d.displayType === 'era') return

    const doc = this.activeDocument
    const tooltip = this.engine.tooltip

    if (tooltip.ownerDocument !== doc) {
      tooltip.remove()
      doc.body.appendChild(tooltip)
    }

    this.engine.hoverTitle.textContent = `Day ${d.startDays}: ${d.name}`
    this.engine.hoverDates.textContent = d.displayType === 'bar'
      ? `${d.startDateDisplay} to ${d.endDateDisplay}`
      : d.startDateDisplay

    this.engine.tooltip.classList.add(Css.tooltip.isActive)

    if (d.link) {
      this.engine.tooltip.setAttribute('data-link', d.link)
    } else {
      this.engine.tooltip.removeAttribute('data-link')
    }
  }

  private handleWindowMouseUp() {
    this.isDragging = false
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
      const upper = window.document.createElementNS(svgUrl, 'line')
      upper.setAttribute('stroke', 'red')
      upper.setAttribute('stroke-width', '1.5')
      upper.setAttribute('stroke-dasharray', '4 4')

      const lower = window.document.createElementNS(svgUrl, 'line')
      lower.setAttribute('stroke', 'red')
      lower.setAttribute('stroke-width', '1.5')
      lower.setAttribute('stroke-dasharray', '4 4')


      svg.appendChild(upper)
      svg.appendChild(lower)
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
      } else {
        // this.lastHoveredTarget.style.outline = ''
        // this.lastHoveredTarget.style.outlineOffset = ''
      }
    }

    if (ganttItem.displayType === 'era') return

    this.lastHoveredTarget = target

    if (ganttItem.displayType === 'bar' || ganttItem.displayType === 'box') {
      // target.style.outline = '1px solid red'
      return
    }

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


    if (ganttItem.displayType === 'diamond') {

      const points = Util.calculatePolygonPoints(11, x + width / 2, y + height / 2, 4)
      shape = Util.createSvg('polygon', 'gt-item timestamp symbol-hover', {points})

    } else if (ganttItem.displayType === 'triangle') {

      const points = Util.calculatePolygonPoints(11, x + width / 2, y + height / 2 + 2, 3)
      shape = Util.createSvg('polygon', 'gt-item timestamp symbol-hover', {points})

    } else if (ganttItem.displayType === 'pentagon') {

      const points = Util.calculatePolygonPoints(11, x + width / 2, y + height / 2 + 1, 5)
      shape = Util.createSvg('polygon', 'gt-item timestamp symbol-hover', {points})

    } else if (ganttItem.displayType === 'hexagon') {

      const points = Util.calculatePolygonPoints(11, x + width / 2, y + height / 2, 6)
      shape = Util.createSvg('polygon', 'gt-item timestamp symbol-hover', {points})

    } else {
      shape = window.document.createElementNS(svgUrl, 'ellipse')
      shape.setAttribute('cx', String(x + width / 2))
      shape.setAttribute('cy', String(y + height / 2))
      shape.setAttribute('rx', String(width / 2 + 3))
      shape.setAttribute('ry', String(height / 2 + 3))
    }
    this.highlightElement.appendChild(shape)
  }

  private hideHighlightAroundElement() {
    if (this.highlightElement) {
      this.highlightElement.remove()
      this.highlightElement = null
    }
    if (this.lastHoveredTarget) {
      // this.lastHoveredTarget.style.outline = ''
      // this.lastHoveredTarget.style.outlineOffset = ''
      this.lastHoveredTarget = null
    }
  }
}
