import {GanttItem} from '../const/types'
import {Css, svgUrl} from '../const/constants'
import {GanttRenderEngine} from './svg-drawer'
import {GanttEventManager} from './event-manager'

export class GanttMobileEventManager implements GanttEventManager {
  public isDragging = false

  private startX = 0
  private startTranslateX = 0
  private initialPinchDistance: number | null = null
  private initialZoomScale = 1
  private rafId: number | null = null
  private currentSvg: SVGElement | null = null
  private verticalGuides: { upper: SVGLineElement; lower: SVGLineElement }[] = []
  private lastHoveredTarget: HTMLElement | null = null
  private highlightElement: SVGElement | null = null
  private autoRestrictZoom = false

  /* Bound handler references for clean removal */
  private readonly boundWindowTouchMove: (e: TouchEvent) => void
  private readonly boundWindowTouchEnd: (e: TouchEvent) => void
  private readonly boundSvgTouchStart: (e: TouchEvent) => void
  private readonly boundSvgTouchMove: (e: TouchEvent) => void

  constructor(
    private engine: GanttRenderEngine,
    readonly mouseOverEventShowBox: boolean,
    readonly mouseOverEventShowVerticalLine: boolean
  ) {
    this.autoRestrictZoom = this.engine.plugin.settings.autoRestrictZoom

    /* Bind all handlers _once_ */
    this.boundWindowTouchMove = this.handleWindowTouchMove.bind(this)
    this.boundWindowTouchEnd = this.handleWindowTouchEnd.bind(this)
    this.boundSvgTouchStart = this.handleSvgTouchStart.bind(this)
    this.boundSvgTouchMove = this.handleSvgTouchMove.bind(this)

    this.attachSvgListeners()
  }

  private activeWindow: Window | null = null

  public attachSvgListeners() {
    this.detachListeners()

    this.currentSvg = this.engine.svg
    if (!this.currentSvg) return

    this.activeWindow = this.currentSvg.ownerDocument.defaultView ?? window
    this.activeWindow.addEventListener('touchmove', this.boundWindowTouchMove, {passive: false})
    this.activeWindow.addEventListener('touchend', this.boundWindowTouchEnd)
    this.activeWindow.addEventListener('touchcancel', this.boundWindowTouchEnd)

    this.currentSvg.addEventListener('touchstart', this.boundSvgTouchStart, {passive: false})
    this.currentSvg.addEventListener('touchmove', this.boundSvgTouchMove, {passive: false})
  }

  private detachListeners() {
    if (this.activeWindow) {
      this.activeWindow.removeEventListener('touchmove', this.boundWindowTouchMove)
      this.activeWindow.removeEventListener('touchend', this.boundWindowTouchEnd)
      this.activeWindow.removeEventListener('touchcancel', this.boundWindowTouchEnd)
      this.activeWindow = null
    }

    if (this.currentSvg) {
      this.currentSvg.removeEventListener('touchstart', this.boundSvgTouchStart)
      this.currentSvg.removeEventListener('touchmove', this.boundSvgTouchMove)
      this.currentSvg = null
    }
  }

  private get activeDocument(): Document {
    return this.currentSvg?.ownerDocument ?? window.document
  }

  private handleWindowTouchMove(e: TouchEvent) {
    if (e.touches.length === 1 && this.isDragging) {
      const touch = e.touches[0]!
      const doc = this.activeDocument
      doc.documentElement.style.setProperty('--mouse-x', `${touch.clientX + 15}px`)
      doc.documentElement.style.setProperty('--mouse-y', `${touch.clientY + 15}px`)

      const deltaX = touch.clientX - this.startX
      this.engine.zoomTranslateX = this.startTranslateX + deltaX

      this.scheduleRender()
    } else if (e.touches.length === 2 && this.initialPinchDistance !== null) {
      e.preventDefault()
      this.handlePinchZoom(e)
    }
  }

  private handleSvgTouchStart(e: TouchEvent) {
    const target = e.target as HTMLElement

    // Handle touch interactions on data elements (Tooltips & Guides)
    if (target?.hasAttribute('data-id')) {
      const rawId = target.getAttribute('data-id')
      if (rawId !== null) {
        const id = Number(rawId)
        const dataObj = this.engine.rawData.find(d => d.id === id)
        if (dataObj) {
          this.showTooltip(dataObj)
          this.showHighlightAroundElement(target, dataObj)
          this.showVerticalGuide(target, dataObj)

          if (dataObj.link) {
            void this.engine.plugin.app.workspace.openLinkText(dataObj.link, '', true)
          }
        }
      }
      return
    }

    // Hide tooltips/highlights if tapping empty canvas
    this.hideTooltipAndGuides()

    if (e.touches.length === 1) {
      this.isDragging = true
      this.startX = e.touches[0]!.clientX
      this.startTranslateX = this.engine.zoomTranslateX
    } else if (e.touches.length === 2) {
      this.isDragging = false
      this.initialPinchDistance = this.getTouchDistance(e.touches[0]!, e.touches[1]!)
      this.initialZoomScale = this.engine.zoomScale
    }
  }

  private handleSvgTouchMove(e: TouchEvent) {
    // Prevent default touch scrolling inside the canvas
    if (e.cancelable) e.preventDefault()
  }

  private handlePinchZoom(e: TouchEvent) {
    if (!this.currentSvg || e.touches.length < 2 || this.initialPinchDistance === null) return

    const t1 = e.touches[0]!
    const t2 = e.touches[1]!
    const currentDistance = this.getTouchDistance(t1, t2)

    if (currentDistance === 0) return

    const rect = this.currentSvg.getBoundingClientRect()
    const touchMidX = (t1.clientX + t2.clientX) / 2 - rect.left - this.engine.config.margin.left

    const pinchFactor = currentDistance / this.initialPinchDistance
    let nextScale = this.initialZoomScale * pinchFactor

    if (this.autoRestrictZoom && this.engine.stepDays < 2 && nextScale > this.engine.zoomScale) {
      nextScale = this.engine.zoomScale
    }
    if (this.autoRestrictZoom && nextScale < 0.5) {
      nextScale = 0.5
    }

    this.engine.zoomTranslateX = touchMidX - (touchMidX - this.engine.zoomTranslateX) * (nextScale / this.engine.zoomScale)
    this.engine.zoomScale = nextScale

    this.scheduleRender()
  }

  private getTouchDistance(t1: Touch, t2: Touch): number {
    const dx = t1.clientX - t2.clientX
    const dy = t1.clientY - t2.clientY
    return Math.hypot(dx, dy)
  }

  private scheduleRender() {
    this.rafId ??= window.requestAnimationFrame(() => {
      const width = this.engine.container.clientWidth || 800
      this.engine.renderData(width)
      this.engine.drawAxes(width)
      this.rafId = null
    })
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
    this.engine.hoverDates.textContent =
      d.displayType === 'bar' ? `${d.startDateDisplay} to ${d.endDateDisplay}` : d.startDateDisplay

    this.engine.tooltip.classList.add(Css.tooltip.isActive)

    if (d.link) {
      this.engine.tooltip.setAttribute('data-link', d.link)
    } else {
      this.engine.tooltip.removeAttribute('data-link')
    }
  }

  private handleWindowTouchEnd() {
    this.isDragging = false
    this.initialPinchDistance = null
    this.stopAnimation()
  }

  public destroy() {
    this.stopAnimation()
    this.detachListeners()
  }

  private stopAnimation() {
    if (this.rafId === null) return
    window.cancelAnimationFrame(this.rafId)
    this.rafId = null
  }

  private hideTooltipAndGuides() {
    this.engine.tooltip.classList.remove(Css.tooltip.isActive)
    this.hideHighlightAroundElement()
    this.hideVerticalGuide()
  }

  private showVerticalGuide(target: HTMLElement, ganttItem: GanttItem) {
    if (!this.mouseOverEventShowVerticalLine) return
    if (ganttItem.displayType === 'era') return

    const svg = target.closest('svg')
    if (!svg) return

    const targetRect = target.getBoundingClientRect()
    const svgRect = svg.getBoundingClientRect()

    if (ganttItem.displayType === 'bar') {
      const x1 = targetRect.left - svgRect.left
      const x2 = targetRect.right - svgRect.left

      this.ensureVerticalGuidesCount(svg, 2)

      if (this.verticalGuides.length === 2) {
        this.updateLine(ganttItem, this.verticalGuides[0]!, x1)
        this.updateLine(ganttItem, this.verticalGuides[1]!, x2)
      }
    } else {
      const x = targetRect.left + targetRect.width / 2 - svgRect.left

      this.ensureVerticalGuidesCount(svg, 1)

      if (this.verticalGuides.length === 1) {
        this.updateLine(ganttItem, this.verticalGuides[0]!, x)
      }
    }
  }

  private ensureVerticalGuidesCount(svg: SVGSVGElement, count: number) {
    while (this.verticalGuides.length > count) {
      const lines = this.verticalGuides.pop()
      lines?.upper?.remove()
      lines?.lower?.remove()
    }

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

  private updateLine(
    ganttItem: GanttItem,
    lines: { upper: SVGLineElement; lower: SVGLineElement },
    x: number
  ) {
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

  private hideVerticalGuide() {
    for (const lines of this.verticalGuides) {
      lines?.upper?.remove()
      lines?.lower?.remove()
    }
    this.verticalGuides = []
  }

  private showHighlightAroundElement(target: HTMLElement, ganttItem: GanttItem) {
    if (!this.mouseOverEventShowBox) return

    if (this.lastHoveredTarget && this.lastHoveredTarget !== target) {
      if (this.highlightElement) {
        this.highlightElement.remove()
        this.highlightElement = null
      } else {
        this.lastHoveredTarget.style.outline = ''
        this.lastHoveredTarget.style.outlineOffset = ''
      }
    }

    if (ganttItem.displayType === 'era') return

    this.lastHoveredTarget = target

    if (ganttItem.displayType === 'bar' || ganttItem.displayType === 'box') {
      target.style.outline = '1px solid red'
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
      const cx = x + width / 2
      const cy = y + height / 2
      const pad = 4
      const points = `${cx},${y - pad} ${cx + width / 2 + pad},${cy} ${cx},${y + height + pad} ${cx - width / 2 - pad},${cy}`
      shape = window.document.createElementNS(svgUrl, 'polygon')
      shape.setAttribute('points', points)
    } else {
      shape = window.document.createElementNS(svgUrl, 'ellipse')
      shape.setAttribute('cx', String(x + width / 2))
      shape.setAttribute('cy', String(y + height / 2))
      shape.setAttribute('rx', String(width / 2 + 3))
      shape.setAttribute('ry', String(height / 2 + 3))
    }

    shape.setAttribute('stroke', 'red')
    shape.setAttribute('stroke-width', '1')
    shape.setAttribute('fill', 'none')
    shape.style.pointerEvents = 'none'

    this.highlightElement.appendChild(shape)
  }

  private hideHighlightAroundElement() {
    if (this.highlightElement) {
      this.highlightElement.remove()
      this.highlightElement = null
    }
    if (this.lastHoveredTarget) {
      this.lastHoveredTarget.style.outline = ''
      this.lastHoveredTarget.style.outlineOffset = ''
      this.lastHoveredTarget = null
    }
  }
}
