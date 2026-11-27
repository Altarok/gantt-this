import {HoverParent, HoverPopover} from 'obsidian'
import {EventId, GanttItem} from '../types/event-types'
import {GanttRenderEngine} from '../render/svg-drawer'
import {GanttChartView} from '../view/gantt-chart-view'
import {SvgDrawerUtil} from '../render/svg-drawer-util'
import {ChartContext} from '../model/chart-context'
import {debug} from '../util/debug'
import {SelfAligningHoverPopover} from './hover-popover'
import {VerticalLineRenderer} from './vertical-line-renderer'
import {EventHighlightRenderer} from './event-highlight-renderer'
import {TooltipRendererHelper} from './tooltip-renderer-helper'
import {Popup} from '../util/popup'
import {TooltipContentBuilder} from './tooltip-content-builder'

export default class TooltipManager implements HoverParent {
  hoverPopover: HoverPopover | null = null
  private lastHoverTarget: HTMLElement | null = null
  private verticalLineRenderer: TooltipRendererHelper
  private eventHighlightRenderer: TooltipRendererHelper
  private tooltipContentBuilder: TooltipRendererHelper

  private readonly boundMouseOver: (evt: MouseEvent) => void

  constructor(private readonly chartCtx: ChartContext,
              private readonly engine: GanttRenderEngine,
              svgDrawerUtil: SvgDrawerUtil) {
    this.verticalLineRenderer = new VerticalLineRenderer(chartCtx, engine)
    this.eventHighlightRenderer = new EventHighlightRenderer(chartCtx, engine, svgDrawerUtil)
    this.tooltipContentBuilder = new TooltipContentBuilder(chartCtx, engine)

    this.boundMouseOver = (evt: MouseEvent) => this.handleMouseOver(evt)
    this.engine.view.container.addEventListener('mouseover', this.boundMouseOver)
  }

  public destroy() {
    this.engine.view.container.removeEventListener('mouseover', this.boundMouseOver)
    this.verticalLineRenderer?.destroy()
    this.eventHighlightRenderer?.destroy()
    this.hideTooltip('destroy')
  }

  private handleMouseOver(evt: MouseEvent): void {
    debug.wnm(`handleMouseOver >> ${evt.x},${evt.y}`)
    let hoverData: { target: HTMLElement, ganttItem: GanttItem } | null = this.getTargetAndMatchingEvent(evt)
    if (!hoverData) {
      debug.wnm(`handleMouseOver << no target`)
      this.hideTooltip('no target')
      return
    }

    const {target, ganttItem} = hoverData

    /* At THIS point we decided to really show a tooltip */
    if (this.lastHoverTarget) delete this.lastHoverTarget.dataset.hasPopover
    this.lastHoverTarget = target
    target.dataset.hasPopover = 'true' // mark element to not duplicate popover on internal mouse moves

    this.renderEventHighlights(target, ganttItem)

    /* CTRL key is reserved for native file preview */
    if (evt.ctrlKey) {
      debug.wnm(`handleMouseOver -- show native preview`)
      if (!ganttItem.link) return debug.wnm(`handleMouseOver << event missing a link`)
      this.showNativePreview(evt, target, ganttItem.link)
    } else {
      debug.wnm(`handleMouseOver -- show tooltip`)
      this.renderTooltip(evt, target, ganttItem)
    }

    debug.wnm(`handleMouseOver <<`)
  }

  private renderTooltip(event: MouseEvent, target: HTMLElement, ganttItem: GanttItem): void {
    try {
      /* create single popover and populate/position it once in onload */
      const popover = new SelfAligningHoverPopover(this, target, ganttItem,
        this.chartView.container.getBoundingClientRect(),
        (item, el) => this.tooltipContentBuilder.render(el, item)
      )

      popover.hoverEl.addEventListener('mouseleave', () => {
        /* Reset marker when popover closes/leaves */
        this.hideTooltip('mouse leave')
        delete target.dataset.hasPopover
      })
    } catch (err) {
      Popup.nok('Failed to show tooltip', err)
    }
  }

  /**
   * Highlights hovered event, related events, renders arrows to connect them.
   * @param target
   * @param ganttItem
   */
  private renderEventHighlights(target: HTMLElement, ganttItem: GanttItem) {

    /* No love for era events */
    if (ganttItem.displayType === 'era') return

    /* Search for SVG */
    const eventSvg: SVGSVGElement | null = target.closest('svg')
    if (!eventSvg) return

    this.verticalLineRenderer.render(target, ganttItem, eventSvg)
    this.eventHighlightRenderer.render(target, ganttItem, eventSvg)
  }

  /**
   * Try to find HTML element under mouse cursor.
   * @param evt mouse event
   */
  private getTargetAndMatchingEvent(evt: MouseEvent): { target: HTMLElement, ganttItem: GanttItem } | null {
    const target = evt.target as HTMLElement // Find the closest task element (works for SVG rects or HTML bars)
    if (!target) return this.hideTooltip('target missing')
    if (!target.hasAttribute('data-id')) return this.hideTooltip('not data-id') // is it a gantt chart with data?
    const id = target.getAttribute('data-id') // extract data ID (unique)
    if (id === null) return this.hideTooltip('data-id is null')
    const ganttItem: GanttItem | undefined = this.getEventById(id)
    if (!ganttItem) return this.hideTooltip('target not a GanttItem')
    if (target.dataset.hasPopover === 'true') return this.hideTooltip('target already has a popover') // already hovering said target?
    return {target, ganttItem}
  }

  private showNativePreview(event: MouseEvent, target: HTMLElement, linktext: string): void {
    try {
      this.chartCtx.workspace.trigger('hover-link', {
        event, target, linktext, source: 'gantt-this', hoverParent: this.engine.view.container,
      })
    } catch (err) {
      Popup.nok('Failed to show native preview', err)
    }
  }

  /**
   * Clean up if mouse drifted off a data element onto empty SVG space
   */
  hideTooltip(_msg: string): null {
    // debug.info(`hideTooltip >> ${_msg}`)
    if (this.lastHoverTarget) delete this.lastHoverTarget.dataset.hasPopover
    this.verticalLineRenderer.destroy()
    this.chartView.clearHoverLayer() // hide highlights
    return null
  }

  private getEventById(id: EventId): GanttItem | undefined {
    return this.engine.drawnData.find(d => d.id === id) // is it a GanttItem?
  }

  private get chartView(): GanttChartView {
    return this.engine.view
  }


}
