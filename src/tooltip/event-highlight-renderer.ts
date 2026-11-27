import {ChartContext} from '../model/chart-context'
import {GanttRenderEngine} from '../render/svg-drawer'
import {EventId, GanttItem} from '../types/event-types'
import {createSvg, SvgDrawerUtil} from '../render/svg-drawer-util'
import {TooltipRendererHelper} from './tooltip-renderer-helper'
import {Css} from '../const/constants'
import {ArrowRenderer} from './arrow-renderer'

type HighLightTarget = { item: GanttItem, svg: SVGElement }
type RelatedTargets = { predecessors: HighLightTarget[], successors: HighLightTarget[] }

export class EventHighlightRenderer extends TooltipRendererHelper {
  private arrowRenderer: ArrowRenderer

  constructor(chartCtx: ChartContext, engine: GanttRenderEngine,
              private readonly svgDrawerUtil: SvgDrawerUtil) {
    super(chartCtx, engine)
    this.arrowRenderer = new ArrowRenderer(engine.view)
  }

  destroy(): void {
    this.arrowRenderer?.destroy()
  }

  /**
   * Renders highlights around hovered event, around its related events, and renders arrows.
   */
  render(target: HTMLElement, ganttItem: GanttItem, eventSvg: SVGSVGElement): void {

    if (ganttItem.displayType === 'era' || ganttItem.displayType === 'vertical-line') return

    if (this.highlightHoveredEvent) this.renderShapeAroundHoveredEvent(target, ganttItem, eventSvg)
    this.renderArrowsAndHighlightRelatedEvents(target, ganttItem, eventSvg)

  }

  /**
   * Highlights related events and renders arrows connecting them to the hovered event.
   */
  private renderArrowsAndHighlightRelatedEvents(target: HTMLElement, ganttItem: GanttItem, eventSvg: SVGSVGElement) {

    const highlightRelatedEvents = this.highlightRelatedEvents
    const drawArrows = this.isDrawArrows

    if (!highlightRelatedEvents && !drawArrows) return

    const relatedTargets: RelatedTargets = this.findRelatedElementsToHighlight(ganttItem)

    relatedTargets.predecessors.forEach(predecessor => {
      if (highlightRelatedEvents) this.renderShapeAroundRelatedEvent(predecessor.svg, predecessor.item, eventSvg)
      if (drawArrows) this.arrowRenderer.drawCurvedArrow(predecessor.svg, target)
    })

    relatedTargets.successors.forEach(successor => {
      if (highlightRelatedEvents) this.renderShapeAroundRelatedEvent(successor.svg, successor.item, eventSvg)
      if (drawArrows) this.arrowRenderer.drawCurvedArrow(target, successor.svg)
    })
  }

  /**
   * Renders colored highlight around hovered event.
   */
  private renderShapeAroundHoveredEvent(target: HTMLElement, ganttItem: GanttItem, eventSvg: SVGElement): void {
    this.renderShapeAroundEvent(target, ganttItem, eventSvg, Css.hover.highlightHoveredEvent)
  }

  /**
   * Renders black or white highlight around related event.
   */
  private renderShapeAroundRelatedEvent(target: SVGElement, ganttItem: GanttItem, eventSvg: SVGElement): void {
    this.renderShapeAroundEvent(target, ganttItem, eventSvg, Css.hover.highlightRelatedEvent)
  }

  private renderShapeAroundEvent(target: SVGElement | HTMLElement,
                                 ganttItem: GanttItem,
                                 eventSvg: SVGElement,
                                 cssClass: string): void {

    if (ganttItem.displayType === 'era' || ganttItem.displayType === 'vertical-line') return

    const targetRect: DOMRect = target.getBoundingClientRect()
    const svgRect: DOMRect = eventSvg.getBoundingClientRect()

    const x: number = targetRect.left - svgRect.left
    const y: number = targetRect.top - svgRect.top
    const width: number = targetRect.width
    const height: number = targetRect.height

    let shape: SVGElement | null

    const centreX = x + width / 2
    const centreY = y + height / 2

    if (ganttItem.displayType === 'bar' || ganttItem.displayType === 'box') {
      shape = createSvg('rect', cssClass, {
        x: x - 1, y: y - 1, width: width + 2, height: height + 2, stroke: this.overlayColor,
        'pointer-events': 'none'
      })
    } else if (ganttItem.displayType === 'point') {
      shape = createSvg('circle', cssClass, {
        cx: String(centreX), cy: String(centreY), r: String(width / 2 + 3), stroke: this.overlayColor
      })
    } else {
      const points = this.calculatePolygonPointsForOverlay(centreX, centreY, ganttItem.displayType)
      shape = createSvg('polygon', cssClass, {points, stroke: this.overlayColor})
    }

    if (shape) this.chartView.renderShapeAroundEvent(shape)
  }

  private calculatePolygonPointsForOverlay(x: number, y: number, symbol: 'triangle' | 'diamond' | 'pentagon' | 'hexagon' | 'octagon' | 'star') {
    switch (symbol) {
      case 'triangle':
        return this.svgDrawerUtil.calculatePolygonPoints(x, y + 2, 3, 1, 0, 3)
      case 'diamond':
        return this.svgDrawerUtil.calculatePolygonPoints(x, y, 4, 1, 0, 3)
      case 'pentagon':
        return this.svgDrawerUtil.calculatePolygonPoints(x, y + 1, 5, 1, 0, 3)
      case 'hexagon':
        return this.svgDrawerUtil.calculatePolygonPoints(x, y, 6, 1, 0, 3)
      case 'octagon':
        return this.svgDrawerUtil.calculatePolygonPoints(x, y, 8, 1, 1 / 8, 3)
      case 'star':
        return this.svgDrawerUtil.calculatePolygonPoints(x, y + 1, 10, 0.382, 0, 4)
    }
  }

  private findRelatedElementsToHighlight(gtItem: GanttItem): RelatedTargets {
    const predecessorsRaw = gtItem.predecessors.map(p => this.getEventById(p)).filter(x => !!x) ?? []
    const successorsRaw = gtItem.successors.map(s => this.getEventById(s)).filter(x => !!x) ?? []

    const predecessors: HighLightTarget[] = this.resolveRelatedEvents(predecessorsRaw)
    const successors: HighLightTarget[] = this.resolveRelatedEvents(successorsRaw)

    return {predecessors, successors}
  }

  private resolveRelatedEvents(events: GanttItem[]): HighLightTarget[] {
    const result: HighLightTarget[] = []
    events.forEach(item => {
      const svg: SVGElement | null = this.chartView.findSvgElementById(item.id)
      if (svg) result.push({item, svg})
    })
    return result
  }

  private getEventById(id: EventId): GanttItem | undefined {
    return this.engine.drawnData.find(d => d.id === id) // is it a GanttItem?
  }

  private get highlightRelatedEvents(): boolean {
    return this.settings.highlightRelatedEvents
  }

  private get highlightHoveredEvent(): boolean {
    return this.settings.highlightHoveredEvent
  }

  private get isDrawArrows(): boolean {
    return this.settings.drawArrows
  }

}
