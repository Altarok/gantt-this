// import {createSvg} from '../view/svg-drawer-util'
import {GanttChartView} from '../views/gantt-chart-view'
import {Css} from '../const/constants'

const diff = 2
type Point = { x: number, y: number }

export class GanttConnectorDrawer {
  constructor(private readonly view: GanttChartView) {
  }

  drawCurvedArrow(fromEl: SVGElement | HTMLElement, toEl: SVGElement | HTMLElement): void {
    const svgRect = this.view.svg.getBoundingClientRect()
    const fromRect = fromEl.getBoundingClientRect()
    const toRect = toEl.getBoundingClientRect()

    let startPoint: Point
    let endPoint: Point

    if (Math.abs(fromRect.y - toRect.y) < 1) {
      /* [from] in same lane as [to] */
      startPoint = centerOfRightBound(fromRect)
      endPoint = centerOfLeftBound(toRect)
    } else if (fromRect.top > toRect.bottom) {
      /* [from] below [to] */
      startPoint = centerOfUpperBound(fromRect)
      endPoint = centerOfLeftBound(toRect)
    } else {
      /* [from] above [to] */
      startPoint = centerOfLowerBound(fromRect)
      endPoint = centerOfLeftBound(toRect)
    }

    const startX = startPoint.x - svgRect.left
    const startY = startPoint.y - svgRect.top
    const endX = endPoint.x - svgRect.left
    const endY = endPoint.y - svgRect.top

    const arrowPathData = createBezierCurve(startX, startY, endX, endY)
    this.drawArrow(arrowPathData)
  }


  /** Draw arrow and cache it to be able to delete it. */
  private drawArrow(pathData: string) {
    this.view.upperHoverLayer.createSvg('path', {
      cls: Css.tooltip.arrows, attr: {d: pathData, fill: 'none', 'marker-end': 'url(#gt-arrow-head)'}
    })
  }

  clearArrows() {
    this.view.upperHoverLayer.empty()
  }

  destroy() {
    this.clearArrows()
  }

}

function centerOfLowerBound(eventShape: DOMRect): Point {
  return {x: eventShape.left + (eventShape.width / 2), y: eventShape.bottom + diff}
}

function centerOfUpperBound(eventShape: DOMRect): Point {
  return {x: eventShape.left + (eventShape.width / 2), y: eventShape.top - diff}
}

function centerOfLeftBound(eventShape: DOMRect): Point {
  return {x: eventShape.left - diff, y: eventShape.top + (eventShape.height / 2)}
}

function centerOfRightBound(eventShape: DOMRect): Point {
  return {x: eventShape.right + diff, y: eventShape.top + (eventShape.height / 2)}
}

/** Create control points for smooth horizontal S-curve (cubic bezier). */
function createBezierCurve(startX: number, startY: number, endX: number, endY: number) {
  const dx = Math.abs(endX - startX) * 0.5
  return `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`
}
