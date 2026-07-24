import {GanttItem} from '../const/types'
import {Css} from '../const/strings'
import {GanttRenderEngine} from './svg-drawer'

export class GanttEventManager {
  public isDragging = false

  private startX = 0
  private startTranslateX = 0
  private rafId: number | null = null
  private currentSvg: SVGElement | null = null

  // Bound handler references for clean removal
  private readonly boundWindowMouseMove: (e: MouseEvent) => void
  private readonly boundWindowMouseUp: () => void
  private readonly boundSvgMouseDown: (e: MouseEvent) => void
  private readonly boundSvgWheel: (e: WheelEvent) => void
  private readonly boundSvgMouseOver: (e: MouseEvent) => void
  private readonly boundSvgMouseMove: (e: MouseEvent) => void
  private readonly boundSvgMouseLeave: () => void
  private readonly boundSvgClick: (e: MouseEvent) => void

  constructor(private engine: GanttRenderEngine) {
    // Bind all handlers once
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

  public attachSvgListeners() {
    // Clean up old SVG listeners if attached
    if (this.currentSvg) {
      this.currentSvg.removeEventListener('mousedown', this.boundSvgMouseDown)
      this.currentSvg.removeEventListener('wheel', this.boundSvgWheel)
      this.currentSvg.removeEventListener('mouseover', this.boundSvgMouseOver)
      this.currentSvg.removeEventListener('mousemove', this.boundSvgMouseMove)
      this.currentSvg.removeEventListener('mouseleave', this.boundSvgMouseLeave)
      this.currentSvg.removeEventListener('click', this.boundSvgClick)
    }

    this.currentSvg = this.engine.svg
    if (!this.currentSvg) return

    this.currentSvg.addEventListener('mousedown', this.boundSvgMouseDown)
    this.currentSvg.addEventListener('wheel', this.boundSvgWheel, {passive: false})
    this.currentSvg.addEventListener('mouseover', this.boundSvgMouseOver)
    this.currentSvg.addEventListener('mousemove', this.boundSvgMouseMove)
    this.currentSvg.addEventListener('mouseleave', this.boundSvgMouseLeave)
    this.currentSvg.addEventListener('click', this.boundSvgClick)
  }



  private handleWindowMouseMove(e: MouseEvent) {
    window.document.documentElement.style.setProperty('--mouse-x', `${e.clientX + 15}px`)
    window.document.documentElement.style.setProperty('--mouse-y', `${e.clientY + 15}px`)

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
    // if ((e.target as HTMLElement).classList.contains(Css.item.item)) return
    if ((e.target as HTMLElement).hasAttribute('data-id')) return
    this.isDragging = true
    this.startX = e.clientX
    this.startTranslateX = this.engine.zoomTranslateX
  }

  private handleSvgWheel(e: WheelEvent) {
    e.preventDefault()
    if (!this.currentSvg) return

    const width = this.engine.container.clientWidth || 800
    const rect = this.currentSvg.getBoundingClientRect()
    const mouseX = e.clientX - rect.left - this.engine.config.margin.left

    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const nextScale = Math.min(100, Math.max(0.05, this.engine.zoomScale * zoomFactor))

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
      if (dataObj) this.showTooltip(dataObj)
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
    }
  }

  private handleSvgMouseLeave() {
    this.engine.tooltip.classList.remove(Css.tooltip.isActive)
  }

  private handleSvgClick(event: MouseEvent) {
    const target = event.target as HTMLElement
    // if (target?.classList.contains(Css.item.item)) {
    if (target?.hasAttribute('data-id')) {
      const rawId = target.getAttribute('data-id')
      if (rawId === null) return
      const id = Number(rawId)
      const dataObj = this.engine.rawData.find(d => d.id === id)
      if (dataObj?.link) {
        void this.engine.plugin.app.workspace.openLinkText(dataObj.link, '', true)
      }
    }
  }

  private showTooltip(d: GanttItem) {
    this.engine.hoverTitle.textContent = d.name
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
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  /** Fully unhook and release all window and SVG listeners to prevent leaks */
  public destroy() {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    // Unhook window listeners
    window.removeEventListener('mousemove', this.boundWindowMouseMove)
    window.removeEventListener('mouseup', this.boundWindowMouseUp)

    // Unhook SVG listeners
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
}

